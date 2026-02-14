import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    IRefairSection(l("Role mode")) {
                        if let roleMode = appState.roleMode {
                            Text(
                                String.localizedStringWithFormat(
                                    l("Current app mode: %@"),
                                    roleName(for: roleMode)
                                )
                            )
                            .font(Theme.font(.subheadline, weight: .semibold))
                            .foregroundStyle(Color.white)
                        }

                        Text(l("This mode is saved on this device to prevent accidental switching."))
                            .font(Theme.font(.caption))
                            .foregroundStyle(Color.white.opacity(0.88))
                    }

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

    private func roleName(for roleMode: AppRoleMode) -> String {
        switch roleMode {
        case .applicant:
            return l("Applicant")
        case .referrer:
            return l("Referrer")
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
}
