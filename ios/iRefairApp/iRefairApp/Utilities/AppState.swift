import Foundation
import Combine

enum AppTab: Hashable {
    case applicant
    case apply
    case applicantPortal
    case referrerForm
    case referrerPortal
    case settings
}

enum AppRoleMode: String, Hashable, CaseIterable {
    case applicant
    case referrer

    var availableTabs: [AppTab] {
        switch self {
        case .applicant:
            return [.applicant, .apply, .applicantPortal, .settings]
        case .referrer:
            return [.referrerForm, .referrerPortal, .settings]
        }
    }
}

final class AppState: ObservableObject {
    private static let roleModeStorageKey = "irefair.appRoleMode"
    private static let referrerPortalAccountsStorageKey = "irefair.referrerPortal.accounts"
    private static let applicantPortalAccountsStorageKey = "irefair.applicantPortal.accounts"
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
            selectedTab = Self.defaultTab(for: storedRole, userDefaults: userDefaults)
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
        selectedTab = Self.defaultTab(for: mode, userDefaults: userDefaults)
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
            selectedTab = Self.defaultTab(for: roleMode, userDefaults: userDefaults)
        }
    }

    func ensureValidSelectedTab() {
        guard let roleMode else { return }
        if !roleMode.availableTabs.contains(selectedTab) {
            selectedTab = Self.defaultTab(for: roleMode, userDefaults: userDefaults)
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

    private static func defaultTab(for mode: AppRoleMode, userDefaults: UserDefaults) -> AppTab {
        switch mode {
        case .applicant:
            return hasStoredApplicantPortalAccount(userDefaults: userDefaults) ? .applicantPortal : .applicant
        case .referrer:
            return hasStoredReferrerPortalAccount(userDefaults: userDefaults) ? .referrerPortal : .referrerForm
        }
    }

    private static func hasStoredReferrerPortalAccount(userDefaults: UserDefaults) -> Bool {
        guard
            let data = userDefaults.data(forKey: Self.referrerPortalAccountsStorageKey),
            let storedAccounts = try? JSONDecoder().decode([ReferrerPortalAccount].self, from: data)
        else {
            return false
        }

        return storedAccounts.contains { !ReferrerPortalAccount.normalize($0.irref).isEmpty }
    }

    private static func hasStoredApplicantPortalAccount(userDefaults: UserDefaults) -> Bool {
        guard
            let data = userDefaults.data(forKey: Self.applicantPortalAccountsStorageKey),
            let storedAccounts = try? JSONDecoder().decode([ApplicantPortalAccount].self, from: data)
        else {
            return false
        }

        return storedAccounts.contains { !ApplicantPortalAccount.normalize($0.irain).isEmpty }
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

struct ApplicantPortalAccount: Identifiable, Codable, Hashable {
    let irain: String
    var displayName: String
    var email: String
    var lastUsedAt: Date

    var id: String {
        normalizedIrain
    }

    var normalizedIrain: String {
        Self.normalize(irain)
    }

    var pickerLabel: String {
        let normalizedDisplayName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalizedDisplayName.isEmpty {
            return irain
        }
        return "\(normalizedDisplayName) - \(irain)"
    }

    static func normalize(_ irain: String) -> String {
        irain.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }
}

final class ApplicantPortalAccountStore: ObservableObject {
    private static let accountsStorageKey = "irefair.applicantPortal.accounts"
    private static let activeAccountStorageKey = "irefair.applicantPortal.activeIrain"
    private static let refreshTokenKeyPrefix = "applicantPortalRefreshToken."

    @Published private(set) var accounts: [ApplicantPortalAccount] = []
    @Published private(set) var activeAccountIrain: String?

    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        load()
    }

    var activeAccount: ApplicantPortalAccount? {
        guard let activeAccountIrain else { return nil }
        return account(for: activeAccountIrain)
    }

    func account(for irain: String) -> ApplicantPortalAccount? {
        let normalized = ApplicantPortalAccount.normalize(irain)
        return accounts.first(where: { $0.normalizedIrain == normalized })
    }

    func setActive(irain: String?) {
        if let irain {
            let normalized = ApplicantPortalAccount.normalize(irain)
            guard accounts.contains(where: { $0.normalizedIrain == normalized }) else { return }
            activeAccountIrain = normalized
            touchLastUsed(irain: normalized)
            userDefaults.set(normalized, forKey: Self.activeAccountStorageKey)
            return
        }
        activeAccountIrain = nil
        userDefaults.removeObject(forKey: Self.activeAccountStorageKey)
    }

    func upsertAccount(from summary: ApplicantPortalSummary, refreshToken: String? = nil, makeActive: Bool = false) {
        let irain = summary.irain.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedIrain = ApplicantPortalAccount.normalize(irain)
        guard !normalizedIrain.isEmpty else { return }

        let displayName = summary.displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = summary.email.trimmingCharacters(in: .whitespacesAndNewlines)
        let now = Date()

        if let index = accounts.firstIndex(where: { $0.normalizedIrain == normalizedIrain }) {
            var existing = accounts[index]
            if !displayName.isEmpty {
                existing.displayName = displayName
            }
            if !email.isEmpty {
                existing.email = email
            }
            existing.lastUsedAt = now
            accounts[index] = existing
        } else {
            accounts.append(
                ApplicantPortalAccount(
                    irain: irain,
                    displayName: displayName.isEmpty ? irain : displayName,
                    email: email,
                    lastUsedAt: now
                )
            )
        }

        if let refreshToken {
            saveRefreshToken(refreshToken, for: normalizedIrain)
        }

        sortAccountsByRecentUse()
        persistAccounts()

        if makeActive {
            setActive(irain: normalizedIrain)
        } else if activeAccountIrain == nil {
            setActive(irain: normalizedIrain)
        }
    }

    func refreshToken(for irain: String) -> String {
        let key = refreshTokenKey(for: irain)
        return (KeychainStore.read(key: key) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    @discardableResult
    func saveRefreshToken(_ token: String, for irain: String) -> Bool {
        let normalizedToken = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedToken.isEmpty else { return false }
        return KeychainStore.save(normalizedToken, key: refreshTokenKey(for: irain))
    }

    func clearRefreshToken(for irain: String) {
        KeychainStore.delete(key: refreshTokenKey(for: irain))
    }

    func removeAccount(irain: String) {
        let normalized = ApplicantPortalAccount.normalize(irain)
        guard !normalized.isEmpty else { return }

        clearRefreshToken(for: normalized)
        accounts.removeAll { $0.normalizedIrain == normalized }
        sortAccountsByRecentUse()
        persistAccounts()

        if activeAccountIrain == normalized {
            if let next = accounts.first {
                setActive(irain: next.normalizedIrain)
            } else {
                setActive(irain: nil)
            }
        }
    }

    func removeAllAccounts() {
        for account in accounts {
            clearRefreshToken(for: account.normalizedIrain)
        }
        accounts = []
        persistAccounts()
        setActive(irain: nil)
    }

    private func touchLastUsed(irain: String) {
        let normalized = ApplicantPortalAccount.normalize(irain)
        guard let index = accounts.firstIndex(where: { $0.normalizedIrain == normalized }) else { return }
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
            let decoded = try? JSONDecoder().decode([ApplicantPortalAccount].self, from: data)
        {
            let deduplicated = Dictionary(grouping: decoded, by: { $0.normalizedIrain })
                .values
                .compactMap { group in
                    group
                        .filter { !$0.normalizedIrain.isEmpty }
                        .sorted(by: { $0.lastUsedAt > $1.lastUsedAt })
                        .first
                }
            accounts = deduplicated.sorted(by: { $0.lastUsedAt > $1.lastUsedAt })
        } else {
            accounts = []
        }

        let storedActiveIrain = userDefaults.string(forKey: Self.activeAccountStorageKey) ?? ""
        let normalizedActive = ApplicantPortalAccount.normalize(storedActiveIrain)
        if !normalizedActive.isEmpty, accounts.contains(where: { $0.normalizedIrain == normalizedActive }) {
            activeAccountIrain = normalizedActive
        } else if let first = accounts.first {
            activeAccountIrain = first.normalizedIrain
            userDefaults.set(first.normalizedIrain, forKey: Self.activeAccountStorageKey)
        } else {
            activeAccountIrain = nil
            userDefaults.removeObject(forKey: Self.activeAccountStorageKey)
        }
    }

    private func refreshTokenKey(for irain: String) -> String {
        let normalized = ApplicantPortalAccount.normalize(irain)
        return "\(Self.refreshTokenKeyPrefix)\(normalized)"
    }
}
