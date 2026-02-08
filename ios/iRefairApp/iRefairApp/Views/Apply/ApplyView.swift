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

                    IRefairSection {
                        IRefairField(l("Your iRAIN *")) {
                            IRefairTextField(l("Enter your iRAIN (legacy CAND-... also accepted)"), text: $applicantId)
                                .accessibilityLabel(l("Your iRAIN *"))
                        }
                        errorText("applicantId")
                        IRefairField(l("Applicant Key *")) {
                            IRefairTextField(l("Enter the Applicant Key from your email"), text: $applicantKey)
                                .accessibilityLabel(l("Applicant Key *"))
                        }
                        errorText("applicantKey")
                        IRefairField(l("Enter the iRCRN of the company you wish to join *")) {
                            IRefairTextField(l("Enter the iRCRN"), text: $iCrn)
                                .textInputAutocapitalization(.characters)
                                .accessibilityLabel(l("Enter the iRCRN of the company you wish to join *"))
                        }
                        errorText("iCrn")
                        IRefairField(l("Position you are applying for *")) {
                            IRefairTextField(l("e.g. Software Engineer"), text: $position)
                                .accessibilityLabel(l("Position you are applying for *"))
                        }
                        errorText("position")
                        IRefairField(l("If available, please enter a reference number for the position (from company's website)")) {
                            IRefairTextField(l("Reference number"), text: $referenceNumber)
                                .accessibilityLabel(l("If available, please enter a reference number for the position (from company's website)"))
                        }
                        IRefairField(l("Attach your CV tailored for this position (required)")) {
                            HStack {
                                Button(l("Add file")) {
                                    showDocumentPicker = true
                                }
                                .buttonStyle(IRefairGhostButtonStyle())
                                .fixedSize(horizontal: true, vertical: false)
                                Text(resumeName.isEmpty ? l("No file chosen") : resumeName)
                                    .font(Theme.font(size: 14))
                                    .foregroundStyle(Color.white.opacity(resumeName.isEmpty ? 0.92 : 1.0))
                                    .lineLimit(2)
                                    .multilineTextAlignment(.leading)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityLabel(l("Attach your CV tailored for this position (required)"))
                        }
                        Text(l("Upload a CV specific to this company and position. PDF or DOC/DOCX, max 10 MB."))
                            .font(Theme.font(size: 14))
                            .foregroundStyle(Color.white.opacity(0.9))
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
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
                        HStack(spacing: 12) {
                            Button(l("Clear form")) {
                                resetForm()
                            }
                            .buttonStyle(IRefairGhostButtonStyle())
                            .frame(maxWidth: .infinity)
                            .disabled(isSubmitting)

                            Button {
                                Task { await submit() }
                            } label: {
                                Text(isSubmitting ? l("Submitting...") : l("Submit"))
                            }
                            .buttonStyle(IRefairPrimaryButtonStyle())
                            .disabled(isSubmitting || !networkMonitor.isConnected)
                        }
                    }

                    IRefairSection {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(l("Use this form to apply to the company you wish to join. You will need your iRefair iRAIN and the iRefair Company Reference Number (iRCRN)."))
                                .font(Theme.font(.subheadline))
                                .foregroundStyle(Color.white.opacity(0.9))
                                .fixedSize(horizontal: false, vertical: true)
                            NavigationLink {
                                HiringCompaniesView()
                            } label: {
                                Text(l("Find iRCRN codes"))
                                    .font(Theme.font(.subheadline, weight: .semibold))
                                    .underline()
                            }
                            .foregroundStyle(Color.white)
                        }
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
                let message = l("Please upload a PDF or DOC/DOCX file under 10MB.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Please upload a PDF or DOC/DOCX file under 10MB.")
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
            errors["applicantId"] = l("Please enter your iRAIN or legacy CAND ID.")
        }
        if applicantKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["applicantKey"] = l("Please enter your Applicant Key.")
        }
        if iCrn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["iCrn"] = l("Please enter the iRCRN.")
        }
        if position.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["position"] = l("Please enter the position you are applying for.")
        }
        if resumeFile == nil {
            errors["resume"] = l("Please upload your resume (PDF or DOC/DOCX under 10MB).")
        }
        fieldErrors = errors
        return errors.isEmpty
    }

    private func resetForm() {
        applicantId = ""
        applicantKey = ""
        iCrn = ""
        position = ""
        referenceNumber = ""
        resumeFile = nil
        resumeName = ""
        fieldErrors = [:]
        errorMessage = nil
        statusMessage = nil
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
            statusMessage = response.message ?? l("Application submitted. We'll log it and follow up with next steps.")
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
