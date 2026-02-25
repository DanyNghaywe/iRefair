import SwiftUI

struct ApplicantRegistrationConfirmationSheet: View {
    private enum SheetState {
        case loading
        case loaded(ApplicantRegistrationConfirmationResponse)
        case localError(String)
    }

    let request: ApplicantRegistrationConfirmationRequest

    private let apiBaseURL: String = APIConfig.baseURL

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var state: SheetState = .loading

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    IRefairCardHeader(
                        eyebrow: l("Applicant"),
                        title: l("Registration confirmation"),
                        lead: l("We're checking your confirmation link and loading your result.")
                    )

                    if !networkMonitor.isConnected {
                        IRefairSection {
                            StatusBanner(text: l("You're offline. Connect to the internet and try again."), style: .warning)
                        }
                    }

                    IRefairSection {
                        content
                    }

                    if !isLoadingState {
                        IRefairSection {
                            actionButtons
                        }
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(l("Close")) { dismiss() }
                    }
                }
            }
        }
        .task(id: request.id) {
            await confirmRegistration()
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var isLoadingState: Bool {
        if case .loading = state {
            return true
        }
        return false
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .loading:
            VStack(alignment: .center, spacing: 14) {
                ProgressView()
                    .tint(Theme.accentPrimary)
                Text(l("Confirming your registration..."))
                    .font(Theme.font(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
                Text(l("Please wait while we verify your link."))
                    .font(Theme.font(size: 14))
                    .foregroundStyle(Theme.ink.opacity(0.82))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)

        case let .loaded(response):
            resultView(response)

        case let .localError(message):
            resultLayout(
                variant: .error,
                heading: l("Registration Failed"),
                description: l("We couldn't complete your registration."),
                footer: l("Need help?"),
                iRain: nil,
                errorMessage: message,
                supportLabel: l("Contact support"),
                supportEmail: "irefair@andbeyondca.com"
            )
        }
    }

    @ViewBuilder
    private var actionButtons: some View {
        switch state {
        case .loading:
            EmptyView()
        case .loaded(let response):
            if !response.ok {
                retryButton
            }
            closeButton
        case .localError:
            retryButton
            closeButton
        }
    }

    private var closeButton: some View {
        Button(l("Close")) {
            dismiss()
        }
        .buttonStyle(IRefairPrimaryButtonStyle(fillWidth: true))
    }

    private var retryButton: some View {
        Button(l("Retry")) {
            Task { await confirmRegistration() }
        }
        .buttonStyle(IRefairGhostButtonStyle(fillWidth: true))
    }

    private func resultView(_ response: ApplicantRegistrationConfirmationResponse) -> some View {
        let variant = response.variant ?? (response.ok ? .confirmed : .error)
        let heading = normalized(response.heading) ?? fallbackHeading(for: variant)
        let description = normalized(response.description) ?? fallbackDescription(for: variant)
        let footer = normalized(response.footer)
            ?? normalized(response.supportPrompt)
            ?? (variant == .error ? l("Need help?") : "")
        let iRain = normalized(response.iRain)
        let errorMessage = normalized(response.errorMessage) ?? normalized(response.error)
        let supportLabel = normalized(response.supportLabel) ?? l("Contact support")
        let supportEmail = normalized(response.supportEmail) ?? "irefair@andbeyondca.com"

        return resultLayout(
            variant: variant,
            heading: heading,
            description: description,
            footer: footer,
            iRain: iRain,
            errorMessage: errorMessage,
            supportLabel: supportLabel,
            supportEmail: supportEmail
        )
    }

    private func resultLayout(
        variant: ApplicantRegistrationConfirmationVariant,
        heading: String,
        description: String,
        footer: String,
        iRain: String?,
        errorMessage: String?,
        supportLabel: String,
        supportEmail: String
    ) -> some View {
        let tone = tone(for: variant)

        return VStack(alignment: .center, spacing: 14) {
            ZStack {
                Circle()
                    .fill(tone.color.opacity(0.16))
                    .overlay(Circle().stroke(tone.color.opacity(0.3), lineWidth: 1))
                    .frame(width: 64, height: 64)
                Image(systemName: tone.icon)
                    .font(.system(size: 26, weight: .semibold))
                    .foregroundStyle(tone.color)
            }

            Text(heading)
                .font(Theme.font(size: 24, weight: .bold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)

            Text(description)
                .font(Theme.font(size: 15))
                .foregroundStyle(Theme.ink.opacity(0.88))
                .multilineTextAlignment(.center)
                .lineSpacing(3)

            if let iRain {
                Text("iRAIN: \(iRain)")
                    .font(Theme.font(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.ink)
                    .padding(.vertical, 8)
                    .padding(.horizontal, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.white.opacity(0.7))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(Color(hex: 0x0F172A).opacity(0.12), lineWidth: 1)
                            )
                    )
            }

            if variant == .error, let errorMessage {
                Text(plainText(errorMessage))
                    .font(Theme.font(size: 14, weight: .medium))
                    .foregroundStyle(Theme.error)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .padding(.vertical, 10)
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Theme.error.opacity(0.08))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(Theme.error.opacity(0.24), lineWidth: 1)
                            )
                    )
            }

            if !footer.isEmpty {
                VStack(spacing: 8) {
                    Text(footer)
                        .font(Theme.font(size: 13))
                        .foregroundStyle(Theme.ink.opacity(0.78))
                        .multilineTextAlignment(.center)

                    if variant == .error,
                       let mailtoURL = URL(string: "mailto:\(supportEmail)") {
                        Link(supportLabel, destination: mailtoURL)
                            .font(Theme.font(size: 14, weight: .semibold))
                            .foregroundStyle(Theme.accentPrimary)
                    }
                }
                .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .padding(.horizontal, 8)
    }

    private func tone(for variant: ApplicantRegistrationConfirmationVariant) -> (icon: String, color: Color) {
        switch variant {
        case .confirmed, .alreadyConfirmed:
            return ("checkmark.circle.fill", Theme.success)
        case .confirmedIneligible, .alreadyConfirmedIneligible:
            return ("exclamationmark.triangle.fill", Theme.warning)
        case .error:
            return ("xmark.circle.fill", Theme.error)
        }
    }

    private func fallbackHeading(for variant: ApplicantRegistrationConfirmationVariant) -> String {
        switch variant {
        case .confirmed:
            return l("Registration Confirmed!")
        case .confirmedIneligible:
            return l("Profile Created")
        case .alreadyConfirmed:
            return l("Account Already Confirmed")
        case .alreadyConfirmedIneligible:
            return l("Account Already Confirmed")
        case .error:
            return l("Registration Failed")
        }
    }

    private func fallbackDescription(for variant: ApplicantRegistrationConfirmationVariant) -> String {
        switch variant {
        case .confirmed:
            return l("Your iRefair profile has been successfully activated. You can now apply for referral opportunities.")
        case .confirmedIneligible:
            return l("Your iRefair profile has been created, but we're unable to match you with referrers at this time.")
        case .alreadyConfirmed:
            return l("This account was already confirmed previously. Your iRefair profile is already active.")
        case .alreadyConfirmedIneligible:
            return l("This account was already confirmed previously, but we're unable to match you with referrers at this time.")
        case .error:
            return l("We couldn't complete your registration.")
        }
    }

    private func normalized(_ value: String?) -> String? {
        guard let value else { return nil }
        let plain = plainText(value)
        return plain.isEmpty ? nil : plain
    }

    private func plainText(_ value: String) -> String {
        value
            .replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    @MainActor
    private func confirmRegistration() async {
        guard !request.token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            state = .localError(l("Missing confirmation token."))
            return
        }

        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            state = .localError(l("App configuration is missing API base URL."))
            return
        }

        guard networkMonitor.isConnected else {
            state = .localError(l("You're offline. Connect to the internet and try again."))
            return
        }

        state = .loading

        do {
            let response = try await APIClient.confirmApplicantRegistration(baseURL: apiBaseURL, token: request.token)
            state = .loaded(response)
            Telemetry.track(
                "applicant_registration_confirmation_opened",
                properties: [
                    "ok": response.ok ? "true" : "false",
                    "variant": response.variant?.rawValue ?? "unknown",
                ]
            )
        } catch {
            Telemetry.capture(error)
            state = .localError(error.localizedDescription)
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}
