import Foundation
import Combine

enum AppTab: Hashable {
    case applicant
    case apply
    case referrerForm
    case referrerPortal
    case settings
}

enum AppRoleMode: String, Hashable, CaseIterable {
    case applicant
    case referrer

    var defaultTab: AppTab {
        switch self {
        case .applicant:
            return .applicant
        case .referrer:
            return .referrerForm
        }
    }

    var availableTabs: [AppTab] {
        switch self {
        case .applicant:
            return [.applicant, .apply, .settings]
        case .referrer:
            return [.referrerForm, .referrerPortal, .settings]
        }
    }
}

final class AppState: ObservableObject {
    private static let roleModeStorageKey = "irefair.appRoleMode"
    private let userDefaults: UserDefaults

    @Published private(set) var selectedTab: AppTab
    @Published private(set) var roleMode: AppRoleMode?
    @Published var suggestedRoleMode: AppRoleMode?
    @Published private(set) var pendingReferrerPortalTokens: [String] = []

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        if
            let rawValue = userDefaults.string(forKey: Self.roleModeStorageKey),
            let storedRole = AppRoleMode(rawValue: rawValue)
        {
            roleMode = storedRole
            selectedTab = storedRole.defaultTab
        } else {
            roleMode = nil
            selectedTab = .settings
        }
    }

    var availableTabs: [AppTab] {
        roleMode?.availableTabs ?? []
    }

    func commitRoleMode(_ mode: AppRoleMode) {
        roleMode = mode
        suggestedRoleMode = nil
        userDefaults.set(mode.rawValue, forKey: Self.roleModeStorageKey)
        selectedTab = mode.defaultTab
    }

    func suggestRoleMode(_ mode: AppRoleMode) {
        guard roleMode == nil else { return }
        suggestedRoleMode = mode
    }

    func selectTab(_ tab: AppTab) {
        guard let roleMode else { return }
        if roleMode.availableTabs.contains(tab) {
            selectedTab = tab
        } else {
            selectedTab = roleMode.defaultTab
        }
    }

    func ensureValidSelectedTab() {
        guard let roleMode else { return }
        if !roleMode.availableTabs.contains(selectedTab) {
            selectedTab = roleMode.defaultTab
        }
    }

    func enqueuePendingReferrerPortalToken(_ token: String) {
        let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        pendingReferrerPortalTokens.append(trimmed)
    }

    func consumeNextPendingReferrerPortalToken() -> String? {
        guard !pendingReferrerPortalTokens.isEmpty else { return nil }
        return pendingReferrerPortalTokens.removeFirst()
    }
}

struct ReferrerPortalAccount: Identifiable, Codable, Hashable {
    let irref: String
    var displayName: String
    var email: String
    var company: String?
    var lastUsedAt: Date

    var id: String {
        normalizedIrref
    }

    var normalizedIrref: String {
        Self.normalize(irref)
    }

    var pickerLabel: String {
        let normalizedDisplayName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalizedDisplayName.isEmpty {
            return irref
        }
        return "\(normalizedDisplayName) - \(irref)"
    }

    static func normalize(_ irref: String) -> String {
        irref.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}

final class ReferrerPortalAccountStore: ObservableObject {
    private static let accountsStorageKey = "irefair.referrerPortal.accounts"
    private static let activeAccountStorageKey = "irefair.referrerPortal.activeIrref"
    private static let refreshTokenKeyPrefix = "referrerPortalRefreshToken."

    @Published private(set) var accounts: [ReferrerPortalAccount] = []
    @Published private(set) var activeAccountIrref: String?

    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        load()
    }

    var activeAccount: ReferrerPortalAccount? {
        guard let activeAccountIrref else { return nil }
        return account(for: activeAccountIrref)
    }

    func account(for irref: String) -> ReferrerPortalAccount? {
        let normalized = ReferrerPortalAccount.normalize(irref)
        return accounts.first(where: { $0.normalizedIrref == normalized })
    }

    func setActive(irref: String?) {
        if let irref {
            let normalized = ReferrerPortalAccount.normalize(irref)
            guard accounts.contains(where: { $0.normalizedIrref == normalized }) else { return }
            activeAccountIrref = normalized
            touchLastUsed(irref: normalized)
            userDefaults.set(normalized, forKey: Self.activeAccountStorageKey)
            return
        }
        activeAccountIrref = nil
        userDefaults.removeObject(forKey: Self.activeAccountStorageKey)
    }

    func upsertAccount(from summary: ReferrerSummary, refreshToken: String? = nil, makeActive: Bool = false) {
        let irref = summary.irref.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedIrref = ReferrerPortalAccount.normalize(irref)
        guard !normalizedIrref.isEmpty else { return }

        let displayName = summary.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = summary.email.trimmingCharacters(in: .whitespacesAndNewlines)
        let company = summary.company?.trimmingCharacters(in: .whitespacesAndNewlines)
        let now = Date()

        if let index = accounts.firstIndex(where: { $0.normalizedIrref == normalizedIrref }) {
            var existing = accounts[index]
            if !displayName.isEmpty {
                existing.displayName = displayName
            }
            if !email.isEmpty {
                existing.email = email
            }
            if let company, !company.isEmpty {
                existing.company = company
            }
            existing.lastUsedAt = now
            accounts[index] = existing
        } else {
            accounts.append(
                ReferrerPortalAccount(
                    irref: irref,
                    displayName: displayName.isEmpty ? irref : displayName,
                    email: email,
                    company: (company?.isEmpty == true) ? nil : company,
                    lastUsedAt: now
                )
            )
        }

        if let refreshToken {
            saveRefreshToken(refreshToken, for: normalizedIrref)
        }

        sortAccountsByRecentUse()
        persistAccounts()

        if makeActive {
            setActive(irref: normalizedIrref)
        } else if activeAccountIrref == nil {
            setActive(irref: normalizedIrref)
        }
    }

    func refreshToken(for irref: String) -> String {
        let key = refreshTokenKey(for: irref)
        return (KeychainStore.read(key: key) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    @discardableResult
    func saveRefreshToken(_ token: String, for irref: String) -> Bool {
        let normalizedToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedToken.isEmpty else { return false }
        return KeychainStore.save(normalizedToken, key: refreshTokenKey(for: irref))
    }

    func clearRefreshToken(for irref: String) {
        KeychainStore.delete(key: refreshTokenKey(for: irref))
    }

    func removeAccount(irref: String) {
        let normalized = ReferrerPortalAccount.normalize(irref)
        guard !normalized.isEmpty else { return }

        clearRefreshToken(for: normalized)
        accounts.removeAll { $0.normalizedIrref == normalized }
        sortAccountsByRecentUse()
        persistAccounts()

        if activeAccountIrref == normalized {
            if let next = accounts.first {
                setActive(irref: next.normalizedIrref)
            } else {
                setActive(irref: nil)
            }
        }
    }

    func removeAllAccounts() {
        for account in accounts {
            clearRefreshToken(for: account.normalizedIrref)
        }
        accounts = []
        persistAccounts()
        setActive(irref: nil)
    }

    private func touchLastUsed(irref: String) {
        let normalized = ReferrerPortalAccount.normalize(irref)
        guard let index = accounts.firstIndex(where: { $0.normalizedIrref == normalized }) else { return }
        accounts[index].lastUsedAt = Date()
        sortAccountsByRecentUse()
        persistAccounts()
    }

    private func sortAccountsByRecentUse() {
        accounts.sort { $0.lastUsedAt > $1.lastUsedAt }
    }

    private func persistAccounts() {
        guard let data = try? JSONEncoder().encode(accounts) else {
            userDefaults.removeObject(forKey: Self.accountsStorageKey)
            return
        }
        userDefaults.set(data, forKey: Self.accountsStorageKey)
    }

    private func load() {
        if
            let data = userDefaults.data(forKey: Self.accountsStorageKey),
            let decoded = try? JSONDecoder().decode([ReferrerPortalAccount].self, from: data)
        {
            let deduplicated = Dictionary(grouping: decoded, by: { $0.normalizedIrref })
                .values
                .compactMap { group in
                    group
                        .filter { !$0.normalizedIrref.isEmpty }
                        .sorted(by: { $0.lastUsedAt > $1.lastUsedAt })
                        .first
                }
            accounts = deduplicated.sorted(by: { $0.lastUsedAt > $1.lastUsedAt })
        } else {
            accounts = []
        }

        let storedActiveIrref = userDefaults.string(forKey: Self.activeAccountStorageKey) ?? ""
        let normalizedActive = ReferrerPortalAccount.normalize(storedActiveIrref)
        if !normalizedActive.isEmpty, accounts.contains(where: { $0.normalizedIrref == normalizedActive }) {
            activeAccountIrref = normalizedActive
        } else if let first = accounts.first {
            activeAccountIrref = first.normalizedIrref
            userDefaults.set(first.normalizedIrref, forKey: Self.activeAccountStorageKey)
        } else {
            activeAccountIrref = nil
            userDefaults.removeObject(forKey: Self.activeAccountStorageKey)
        }
    }

    private func refreshTokenKey(for irref: String) -> String {
        let normalized = ReferrerPortalAccount.normalize(irref)
        return "\(Self.refreshTokenKeyPrefix)\(normalized)"
    }
}
