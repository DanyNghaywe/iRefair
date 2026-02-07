import SwiftUI

struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    private let apiBaseURL: String = APIConfig.baseURL

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
                            StatusBanner(text: l("You're offline. Connect to the internet to send feedback."), style: .warning)
                        }
                    }

                    IRefairSection(l("Applicant")) {
                        Text(applicant.displayName)
                        Text(applicant.irain)
                            .font(Theme.font(.caption))
                            .foregroundStyle(Theme.muted)
                    }

                    IRefairSection(l("Feedback")) {
                        IRefairField(l("Share feedback")) {
                            IRefairTextField("", text: $feedback, axis: .vertical)
                                .lineLimit(4, reservesSpace: true)
                                .accessibilityLabel(l("Share feedback"))
                        }
                        IRefairField(l("Rating")) {
                            Picker(l("Rating"), selection: $rating) {
                                ForEach(1...5, id: \.self) { value in
                                    Text("\(value)").tag(value)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                        Toggle(l("Recommend"), isOn: $recommend)
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
                                Text(l("Send feedback"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(l("Close")) { dismiss() }
                    }
                }
            }
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    @MainActor
    private func submit() async {
        errorMessage = nil
        guard !token.isEmpty else {
            errorMessage = l("Missing token.")
            return
        }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
            return
        }
        guard !feedback.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = l("Feedback is required.")
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
