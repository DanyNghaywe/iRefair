import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            ApplicantView()
                .tabItem {
                    Label(l("Applicant", "Candidat"), systemImage: "person.text.rectangle")
                }
                .tag(AppTab.applicant)

            ApplyView()
                .tabItem {
                    Label(l("Apply", "Postuler"), systemImage: "paperplane")
                }
                .tag(AppTab.apply)

            ReferrerView()
                .tabItem {
                    Label(l("Referrer", "Référent"), systemImage: "person.2")
                }
                .tag(AppTab.referrer)

            SettingsView()
                .tabItem {
                    Label(l("Settings", "Paramètres"), systemImage: "gearshape")
                }
                .tag(AppTab.settings)
        }
        .tint(Color("BrandBlue"))
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
        .environmentObject(NetworkMonitor())
}
