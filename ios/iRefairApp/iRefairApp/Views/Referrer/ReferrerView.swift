import SwiftUI

struct ReferrerView: View {
    enum Section: String, CaseIterable {
        case register = "Register"
        case portal = "Portal"
    }

    @State private var selection: Section = .register

    var body: some View {
        NavigationStack {
            IRefairScreen {
                VStack {
                    VStack {
                        Picker(l("Mode"), selection: $selection) {
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
            }
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func label(for section: Section) -> String {
        switch section {
        case .register:
            return l("Register")
        case .portal:
            return l("Portal")
        }
    }
}

#Preview {
    ReferrerView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
        .environmentObject(ReferrerPortalAccountStore())
}
