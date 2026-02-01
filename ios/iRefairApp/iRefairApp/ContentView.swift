import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            ApplicantView()
                .tabItem {
                    Label(l("Applicant"), systemImage: "person.text.rectangle")
                }
                .tag(AppTab.applicant)

            ApplyView()
                .tabItem {
                    Label(l("Apply"), systemImage: "paperplane")
                }
                .tag(AppTab.apply)

            ReferrerView()
                .tabItem {
                    Label(l("Referrer"), systemImage: "person.2")
                }
                .tag(AppTab.referrer)

            SettingsView()
                .tabItem {
                    Label(l("Settings"), systemImage: "gearshape")
                }
                .tag(AppTab.settings)
        }
        .background(Color.clear)
        .toolbarBackground(.hidden, for: .tabBar)
        .tint(Theme.accentPrimary)
        .environment(\.font, Theme.font(.body))
        .preferredColorScheme(.light)
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
}
