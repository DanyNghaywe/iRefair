import SwiftUI

@main
struct iRefairApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var networkMonitor = NetworkMonitor()

    init() {
        Telemetry.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(networkMonitor)
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
            KeychainStore.save(token, key: "referrerPortalToken")
            appState.selectedTab = .referrer
            return
        }

        let isUpdateLink = host.contains("applicant") || host.contains("update") || path.contains("applicant") || path.contains("update")
        if isUpdateLink {
            let updateToken = query["updatetoken"] ?? query["token"] ?? ""
            let appId = query["appid"] ?? query["applicationid"] ?? ""
            if !updateToken.isEmpty && !appId.isEmpty {
                UserDefaults.standard.set(updateToken, forKey: "applicantUpdateToken")
                UserDefaults.standard.set(appId, forKey: "applicantUpdateAppId")
                appState.selectedTab = .applicant
            }
        } else if host.contains("irefair") {
            // Fallback for universal links with tokens in query
            let updateToken = query["updatetoken"] ?? ""
            let appId = query["appid"] ?? ""
            if !updateToken.isEmpty && !appId.isEmpty {
                UserDefaults.standard.set(updateToken, forKey: "applicantUpdateToken")
                UserDefaults.standard.set(appId, forKey: "applicantUpdateAppId")
                appState.selectedTab = .applicant
            }
        }
    }
}
