import Foundation

enum AppTab: Hashable {
    case applicant
    case apply
    case referrer
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
            return .referrer
        }
    }

    var availableTabs: [AppTab] {
        switch self {
        case .applicant:
            return [.applicant, .apply, .settings]
        case .referrer:
            return [.referrer, .settings]
        }
    }
}

final class AppState: ObservableObject {
    private static let roleModeStorageKey = "irefair.appRoleMode"
    private let userDefaults: UserDefaults

    @Published private(set) var selectedTab: AppTab
    @Published private(set) var roleMode: AppRoleMode?
    @Published var suggestedRoleMode: AppRoleMode?
    @Published var pendingReferrerLoginToken: String?
    @Published var pendingReferrerPortalToken: String?

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

    func consumePendingReferrerLoginToken() -> String? {
        let token = pendingReferrerLoginToken
        pendingReferrerLoginToken = nil
        return token
    }

    func consumePendingReferrerPortalToken() -> String? {
        let token = pendingReferrerPortalToken
        pendingReferrerPortalToken = nil
        return token
    }
}
