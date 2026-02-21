import SwiftUI
import UIKit

@main
struct iRefairApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var networkMonitor = NetworkMonitor()
    @StateObject private var referrerPortalAccountStore = ReferrerPortalAccountStore()
    @StateObject private var applicantPortalAccountStore = ApplicantPortalAccountStore()

    init() {
        Telemetry.configure()
        configureAppearance()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(networkMonitor)
                .environmentObject(referrerPortalAccountStore)
                .environmentObject(applicantPortalAccountStore)
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    private func handleDeepLink(_ url: URL) {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }

        let host = (components.host ?? "").lowercased()
        let path = components.path.lowercased()
        let queryItems = components.queryItems ?? []
        let query: [String: String] = queryItems.reduce(into: [:]) { partial, item in
            if let value = item.value {
                partial[item.name.lowercased()] = value
            }
        }

        let isPortalLink = host.contains("portal") || host.contains("referrer") || path.contains("portal") || path.contains("referrer")
        if isPortalLink, let token = query["token"] ?? query["referrertoken"] {
            appState.enqueuePendingReferrerPortalToken(token)
            appState.suggestRoleMode(.referrer)
            appState.selectTab(.referrerPortal)
            return
        }

        let isApplicantPortalLink = (host.contains("applicant") || path.contains("applicant")) && (host.contains("portal") || path.contains("portal"))
        if isApplicantPortalLink {
            appState.suggestRoleMode(.applicant)
            appState.selectTab(.applicantPortal)
            return
        }

        let isRegistrationConfirmationLink =
            (path.contains("confirm-registration") && (path.contains("applicant") || host.contains("applicant")))
            || host.contains("confirm-registration")
        if isRegistrationConfirmationLink, let token = query["token"], !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            appState.presentApplicantRegistrationConfirmation(token: token)
            appState.suggestRoleMode(.applicant)
            if appState.roleMode == .applicant {
                appState.selectTab(.applicant)
            }
            return
        }

        let isUpdateLink = host.contains("applicant") || host.contains("update") || path.contains("applicant") || path.contains("update")
        if isUpdateLink {
            let updateToken = query["updatetoken"] ?? query["token"] ?? ""
            let appId = query["appid"] ?? query["applicationid"] ?? ""
            if !updateToken.isEmpty && !appId.isEmpty {
                UserDefaults.standard.set(updateToken, forKey: "applicantUpdateToken")
                UserDefaults.standard.set(appId, forKey: "applicantUpdateAppId")
                appState.suggestRoleMode(.applicant)
                appState.selectTab(.applicant)
            }
        } else if host.contains("irefair") {
            // Fallback for universal links with tokens in query
            let updateToken = query["updatetoken"] ?? ""
            let appId = query["appid"] ?? ""
            if !updateToken.isEmpty && !appId.isEmpty {
                UserDefaults.standard.set(updateToken, forKey: "applicantUpdateToken")
                UserDefaults.standard.set(appId, forKey: "applicantUpdateAppId")
                appState.suggestRoleMode(.applicant)
                appState.selectTab(.applicant)
            }
        }
    }

    private func configureAppearance() {
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithTransparentBackground()
        navAppearance.backgroundEffect = nil
        navAppearance.backgroundColor = .clear
        navAppearance.shadowColor = .clear
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: Theme.uiFont(size: 17, weight: .semibold),
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: Theme.uiFont(size: 34, weight: .bold),
        ]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().tintColor = .white

        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithTransparentBackground()
        tabAppearance.backgroundEffect = nil
        tabAppearance.backgroundColor = .clear
        tabAppearance.shadowColor = .clear
        tabAppearance.stackedLayoutAppearance.selected.iconColor = UIColor(hex: 0x3D8BFD)
        tabAppearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor(hex: 0x3D8BFD),
        ]
        tabAppearance.stackedLayoutAppearance.normal.iconColor = UIColor.white.withAlphaComponent(0.7)
        tabAppearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor.white.withAlphaComponent(0.7),
        ]
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        UITabBar.appearance().isTranslucent = true
        UINavigationBar.appearance().isTranslucent = true

        UITableView.appearance().backgroundColor = .clear
        UITableViewCell.appearance().backgroundColor = .clear
        UITableView.appearance().separatorColor = UIColor(hex: 0xE2E6F1, alpha: 0.6)

        UISegmentedControl.appearance().selectedSegmentTintColor = UIColor(hex: 0x3D8BFD, alpha: 0.28)
        UISegmentedControl.appearance().backgroundColor = UIColor.white.withAlphaComponent(0.12)
        UISegmentedControl.appearance().setTitleTextAttributes([
            .foregroundColor: UIColor.white.withAlphaComponent(0.82),
        ], for: .normal)
        UISegmentedControl.appearance().setTitleTextAttributes([
            .foregroundColor: UIColor(hex: 0x0F172A),
        ], for: .selected)
    }
}
