import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @State private var statusMessage: String?
    @State private var showRoleSwitchConfirmation = false
    @State private var rolePendingConfirmation: AppRoleMode = .applicant

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

                        if let roleMode = appState.roleMode {
                            let nextMode = alternateRole(for: roleMode)

                            Button(
                                String.localizedStringWithFormat(
                                    l("Switch to %@ mode"),
                                    roleName(for: nextMode)
                                )
                            ) {
                                rolePendingConfirmation = nextMode
                                showRoleSwitchConfirmation = true
                            }
                            .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
                        }
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
        .alert(l("Switch app mode?"), isPresented: $showRoleSwitchConfirmation) {
            Button(
                String.localizedStringWithFormat(
                    l("Switch to %@"),
                    roleName(for: rolePendingConfirmation)
                )
            ) {
                appState.commitRoleMode(rolePendingConfirmation)
                statusMessage = String.localizedStringWithFormat(
                    l("Switched app mode to %@."),
                    roleName(for: rolePendingConfirmation)
                )
            }
            Button(l("Cancel"), role: .cancel) {}
        } message: {
            Text(
                String.localizedStringWithFormat(
                    l("This will change the available tabs and open %@ mode."),
                    roleName(for: rolePendingConfirmation)
                )
            )
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

    private func alternateRole(for roleMode: AppRoleMode) -> AppRoleMode {
        roleMode == .applicant ? .referrer : .applicant
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
}
