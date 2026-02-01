import SwiftUI

struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

    @EnvironmentObject private var networkMonitor: NetworkMonitor

    let applicant: ReferrerApplicant
    let token: String
    let onSubmitted: () -> Void

    @State private var feedback = ""
    @State private var rating = 5
    @State private var recommend = true
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    if !networkMonitor.isConnected {
                        IRefairSection {
                            StatusBanner(text: l("You're offline. Connect to the internet to send feedback.", "Vous êtes hors ligne. Connectez-vous à Internet pour envoyer l’avis."), style: .warning)
                        }
                    }

                    IRefairSection(l("Applicant", "Candidat")) {
                        Text(applicant.displayName)
                        Text(applicant.irain)
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }

                    IRefairSection(l("Feedback", "Avis")) {
                        IRefairField(l("Share feedback", "Partagez votre avis")) {
                            TextField("", text: $feedback, axis: .vertical)
                                .lineLimit(4, reservesSpace: true)
                                .accessibilityLabel(l("Share feedback", "Partagez votre avis"))
                        }
                        IRefairField(l("Rating", "Évaluation")) {
                            Picker(l("Rating", "Évaluation"), selection: $rating) {
                                ForEach(1...5, id: \.self) { value in
                                    Text("\(value)").tag(value)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                        Toggle(l("Recommend", "Recommander"), isOn: $recommend)
                            .toggleStyle(IRefairCheckboxToggleStyle())
                    }

                    if let errorMessage {
                        IRefairSection {
                            StatusBanner(text: errorMessage, style: .error)
                        }
                    }

                    IRefairSection {
                        Button {
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text(l("Send feedback", "Envoyer un avis"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
                    }
                }
                .navigationTitle(l("Feedback", "Avis"))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(l("Close", "Fermer")) { dismiss() }
                    }
                }
            }
        }
    }

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    @MainActor
    private func submit() async {
        errorMessage = nil
        guard !token.isEmpty else {
            errorMessage = l("Missing token.", "Jeton manquant.")
            return
        }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("Set your API base URL in Settings first.", "Définissez d'abord l'URL de base de l'API dans Paramètres.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.", "Vous êtes hors ligne. Connectez-vous à Internet et réessayez.")
            return
        }
        guard !feedback.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = l("Feedback is required.", "Le commentaire est requis.")
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            _ = try await APIClient.submitReferrerFeedback(
                baseURL: apiBaseURL,
                token: token,
                applicantId: applicant.irain,
                feedback: feedback,
                rating: rating,
                recommend: recommend
            )
            Telemetry.track("referrer_feedback_sent", properties: ["rating": "\(rating)", "recommend": recommend ? "yes" : "no"])
            onSubmitted()
            dismiss()
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}
