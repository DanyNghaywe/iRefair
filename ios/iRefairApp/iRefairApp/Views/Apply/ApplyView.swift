import SwiftUI
import UniformTypeIdentifiers

struct ApplyView: View {
    private let apiBaseURL: String = APIConfig.baseURL
    private let moreInfoURL = URL(string: "https://andbeyondca.com/impact/")
    private let applyLinkTopSpacing: CGFloat = 8

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var networkMonitor: NetworkMonitor

    @State private var applicantId = ""
    @State private var applicantKey = ""
    @State private var iCrn = ""
    @State private var position = ""
    @State private var referenceNumber = ""

    @State private var resumeFile: UploadFile?
    @State private var resumeName = ""
    @State private var showDocumentPicker = false

    @State private var isSubmitting = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    @State private var fieldErrors: [String: String] = [:]

    var body: some View {
        NavigationStack {
            IRefairScreen {
                IRefairForm {
                    VStack(alignment: .leading, spacing: Theme.cardHeaderTextGap) {
                        Text(l("Application"))
                            .font(Theme.font(size: 11, weight: .semibold))
                            .foregroundStyle(Color.white.opacity(0.7))
                            .textCase(.uppercase)
                            .kerning(1.1)
                        Text(l("iRefair - Apply Now"))
                            .font(Theme.font(size: 24, weight: .bold))
                            .foregroundStyle(Color.white)
                            .kerning(-0.5)
                        Text(l("iRefair is a free initiative created to support Lebanese and Arab newcomers in Canada by connecting them with professionals who can refer them for jobs."))
                            .font(Theme.font(size: 16))
                            .foregroundStyle(Color.white.opacity(0.85))
                            .lineSpacing(4)
                        if let moreInfoURL {
                            HStack(spacing: 4) {
                                Text(l("For more info, visit"))
                                    .font(Theme.font(size: applyLinkFontSize))
                                Link(destination: moreInfoURL) {
                                    Text(l("&BeyondCA"))
                                        .font(Theme.font(size: applyLinkFontSize, weight: .bold))
                                        .foregroundStyle(Color.white.opacity(0.95))
                                        .padding(.bottom, 0)
                                        .overlay(alignment: .bottom) {
                                            Rectangle()
                                                .fill(Color.white.opacity(0.95))
                                                .frame(height: 1.1)
                                                .offset(y: -0.25)
                                        }
                                }
                            }
                            .foregroundStyle(Color.white.opacity(0.95))
                            .tint(Color.white.opacity(0.95))
                            .padding(.top, applyLinkTopSpacing - Theme.cardHeaderTextGap)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, Theme.cardHeaderPaddingVertical)

                    if !networkMonitor.isConnected {
                        IRefairSection {
                            StatusBanner(text: l("You're offline. Connect to the internet to submit the form."), style: .warning)
                        }
                    }

                    IRefairSection(l("Application details")) {
                        IRefairField(l("Applicant ID (iRAIN) *")) {
                            IRefairTextField(l("Enter your iRAIN (legacy CAND-... also accepted)"), text: $applicantId)
                                .accessibilityLabel(l("Applicant ID (iRAIN) *"))
                        }
                        errorText("applicantId")
                        IRefairField(l("Applicant Key *")) {
                            IRefairTextField(l("Enter the Applicant Key from your email"), text: $applicantKey)
                                .accessibilityLabel(l("Applicant Key *"))
                        }
                        errorText("applicantKey")
                        IRefairField(l("iRCRN *")) {
                            IRefairTextField(l("Enter the iRCRN"), text: $iCrn)
                                .textInputAutocapitalization(.characters)
                                .accessibilityLabel(l("iRCRN *"))
                        }
                        errorText("iCrn")
                        VStack(alignment: .leading, spacing: 8) {
                            Text(l("Need an iRCRN?"))
                                .font(Theme.font(.caption))
                                .foregroundStyle(Color.white.opacity(0.82))
                            NavigationLink {
                                HiringCompaniesView()
                            } label: {
                                HStack(spacing: 8) {
                                    Text(l("Browse hiring companies"))
                                    Spacer(minLength: 0)
                                    Image(systemName: "chevron.right")
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                        }
                        IRefairField(l("Position *")) {
                            IRefairTextField(l("e.g. Software Engineer"), text: $position)
                                .accessibilityLabel(l("Position *"))
                        }
                        errorText("position")
                        IRefairField(l("Reference number")) {
                            IRefairTextField(l("Reference number"), text: $referenceNumber)
                                .accessibilityLabel(l("Reference number"))
                        }
                    }

                    IRefairSection(l("Resume")) {
                        IRefairField(l("Resume")) {
                            HStack {
                                Text(resumeName.isEmpty ? l("No file selected") : resumeName)
                                    .font(Theme.font(.subheadline))
                                    .foregroundStyle(resumeName.isEmpty ? Theme.muted : Theme.ink)
                                Spacer()
                                Button(l("Choose file")) {
                                    showDocumentPicker = true
                                }
                                .buttonStyle(IRefairGhostButtonStyle())
                            }
                            .irefairInput()
                            .accessibilityLabel(l("Resume file"))
                        }
                        errorText("resume")
                    }

                    if let errorMessage {
                        IRefairSection {
                            StatusBanner(text: errorMessage, style: .error)
                        }
                    }

                    if let statusMessage {
                        IRefairSection {
                            StatusBanner(text: statusMessage, style: .success)
                        }
                    }

                    IRefairSection {
                        Button {
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text(l("Submit Application"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
                    }
                }
                .sheet(isPresented: $showDocumentPicker) {
                    DocumentPicker(allowedTypes: allowedTypes()) { url in
                        handlePickedFile(url)
                    }
                }
            }
        }
    }

    private func errorText(_ key: String) -> some View {
        Group {
            if let message = fieldErrors[key] {
                Text(message).foregroundStyle(Theme.error).font(Theme.font(.caption))
            }
        }
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private func allowedTypes() -> [UTType] {
        var types: [UTType] = [.pdf]
        if let doc = UTType(filenameExtension: "doc") { types.append(doc) }
        if let docx = UTType(filenameExtension: "docx") { types.append(docx) }
        return types
    }

    private var applyLinkFontSize: CGFloat {
        horizontalSizeClass == .compact ? 15 : 16
    }

    private func handlePickedFile(_ url: URL) {
        do {
            guard FileSupport.isSupportedResume(url) else {
                let message = l("Resume must be a PDF, DOC, or DOCX file.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Resume must be under 10 MB.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            resumeName = url.lastPathComponent
            resumeFile = UploadFile(
                fieldName: "resume",
                fileName: url.lastPathComponent,
                mimeType: FileSupport.mimeType(for: url),
                data: data
            )
            fieldErrors["resume"] = nil
        } catch {
            errorMessage = l("Unable to load the selected file.")
        }
    }

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        if applicantId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["applicantId"] = l("Applicant ID is required.")
        }
        if applicantKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["applicantKey"] = l("Applicant key is required.")
        }
        if iCrn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["iCrn"] = l("iRCRN is required.")
        }
        if position.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["position"] = l("Position is required.")
        }
        if resumeFile == nil {
            errors["resume"] = l("Please attach a resume.")
        }
        fieldErrors = errors
        return errors.isEmpty
    }

    private func buildPayload() -> [String: String] {
        [
            "applicantId": applicantId.trimmingCharacters(in: .whitespacesAndNewlines),
            "applicantKey": applicantKey.trimmingCharacters(in: .whitespacesAndNewlines),
            "iCrn": iCrn.trimmingCharacters(in: .whitespacesAndNewlines),
            "position": position.trimmingCharacters(in: .whitespacesAndNewlines),
            "referenceNumber": referenceNumber.trimmingCharacters(in: .whitespacesAndNewlines),
            "language": AppLocale.languageCode,
            "website": "",
        ]
    }

    @MainActor
    private func submit() async {
        errorMessage = nil
        statusMessage = nil
        guard validate() else { return }
        guard let resumeFile else { return }
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let payload = buildPayload()
            let response = try await APIClient.submitApplication(
                baseURL: apiBaseURL,
                payload: payload,
                resume: resumeFile
            )
            statusMessage = response.message ?? l("Application submitted successfully.")
            Telemetry.track("apply_submit_success")
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ApplyView()
        .environmentObject(NetworkMonitor())
}
