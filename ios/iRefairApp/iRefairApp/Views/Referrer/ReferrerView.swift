import SwiftUI

struct ReferrerView: View {
    enum Section: String, CaseIterable {
        case register = "Register"
        case portal = "Portal"
    }

    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

    @State private var selection: Section = .register

    var body: some View {
        NavigationStack {
            IRefairScreen {
                VStack {
                    VStack {
                        Picker(l("Mode", "Mode"), selection: $selection) {
                            ForEach(Section.allCases, id: \.self) { item in
                                Text(label(for: item)).tag(item)
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Theme.segmentBackground)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(Theme.segmentBorder, lineWidth: 1)
                            )
                    )
                    .padding(.horizontal, Theme.appPaddingHorizontal)
                    .padding(.top, Theme.appPaddingVertical)

                    if selection == .register {
                        ReferrerRegistrationView()
                    } else {
                        ReferrerPortalView()
                    }
                }
                .navigationTitle(l("Referrer", "Référent"))
            }
        }
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    private func label(for section: Section) -> String {
        switch section {
        case .register:
            return l("Register", "Inscription")
        case .portal:
            return l("Portal", "Portail")
        }
    }
}

#Preview {
    ReferrerView()
        .environmentObject(NetworkMonitor())
}
