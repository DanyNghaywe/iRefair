import SwiftUI

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"

    @State private var draftBaseURL = ""
    @State private var statusMessage: String?

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    IRefairSection(l("API Configuration")) {
                        IRefairField(l("Base URL")) {
                            TextField("", text: $draftBaseURL)
                                .keyboardType(.URL)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .accessibilityLabel(l("Base URL"))
                        }
                        HStack {
                            Button(l("Save")) {
                                let cleaned = Validator.sanitizeBaseURL(draftBaseURL)
                                apiBaseURL = cleaned
                                statusMessage = l("Saved.")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            Spacer()
                            Button(l("Reset")) {
                                apiBaseURL = "https://irefair.com"
                                draftBaseURL = apiBaseURL
                                statusMessage = l("Reset to default.")
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                        }
                        Text(l("Use your production URL or local dev server (e.g. http://localhost:3000)."))
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }

                    IRefairSection(l("Legal")) {
                        if let privacyUrl = URL(string: "https://irefair.com/privacy") {
                            Link(l("Privacy Policy"), destination: privacyUrl)
                        }
                        if let termsUrl = URL(string: "https://irefair.com/terms") {
                            Link(l("Terms of Service"), destination: termsUrl)
                        }
                    }

                    if let statusMessage {
                        IRefairSection {
                            StatusBanner(text: statusMessage ?? "", style: .success)
                        }
                    }

                    IRefairSection(l("App data")) {
                        Button(l("Clear saved referrer token")) {
                            KeychainStore.delete(key: "referrerPortalToken")
                            statusMessage = l("Cleared referrer token.")
                        }
                        .buttonStyle(IRefairGhostButtonStyle())
                    }
                }
                .navigationTitle(l("Settings"))
                .onAppear {
                    draftBaseURL = apiBaseURL
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
