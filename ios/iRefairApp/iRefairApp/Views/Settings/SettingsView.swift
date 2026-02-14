import SwiftUI

struct SettingsView: View {
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    IRefairSection(l("Legal")) {
                        if let privacyUrl = URL(string: "\(APIConfig.baseURL)/privacy") {
                            Link(l("Privacy Policy"), destination: privacyUrl)
                        }
                        if let termsUrl = URL(string: "\(APIConfig.baseURL)/terms") {
                            Link(l("Terms of Service"), destination: termsUrl)
                        }
                    }

                    if let statusMessage {
                        IRefairSection {
                            StatusBanner(text: statusMessage, style: .success)
                        }
                    }

                    IRefairSection(l("App data")) {
                        Button(l("Clear saved referrer token")) {
                            KeychainStore.delete(key: "referrerPortalToken")
                            KeychainStore.delete(key: "referrerPortalRefreshToken")
                            statusMessage = l("Cleared referrer token.")
                        }
                        .buttonStyle(IRefairGhostButtonStyle())
                    }
                }
            }
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}

#Preview {
    SettingsView()
        .environmentObject(NetworkMonitor())
}
