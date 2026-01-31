import SwiftUI
import UniformTypeIdentifiers

struct ApplyView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "https://irefair.com"
    @AppStorage("submissionLanguage") private var submissionLanguage: String = "en"

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
                    if !networkMonitor.isConnected {
                        Section {
                            StatusBanner(text: l("You're offline. Connect to the internet to submit the form.", "Vous êtes hors ligne. Connectez-vous à Internet pour soumettre le formulaire."), style: .warning)
                        }
                    }

                    Section {
                        Text(l("Submit an application using your iRAIN and Applicant Key.",
                               "Soumettez une candidature avec votre iRAIN et votre clé de candidat."))
                            .font(Theme.font(.subheadline))
                            .foregroundStyle(Theme.muted)
                    }

                    Section(l("Submission language", "Langue de soumission")) {
                        Picker(l("Language", "Langue"), selection: $submissionLanguage) {
                            Text(l("English", "Anglais")).tag("en")
                            Text(l("French", "Français")).tag("fr")
                        }
                        .pickerStyle(.segmented)
                    }

                    Section(l("Application details", "Détails de la candidature")) {
                        TextField(l("Applicant ID (iRAIN) *", "ID candidat (iRAIN) *"), text: $applicantId)
                        errorText("applicantId")
                        TextField(l("Applicant Key *", "Clé du candidat *"), text: $applicantKey)
                        errorText("applicantKey")
                        TextField(l("iRCRN *", "iRCRN *"), text: $iCrn)
                            .textInputAutocapitalization(.characters)
                        errorText("iCrn")
                        TextField(l("Position *", "Poste *"), text: $position)
                        errorText("position")
                        TextField(l("Reference number", "Numéro de référence"), text: $referenceNumber)
                    }

                    Section(l("Resume", "CV")) {
                        HStack {
                            Text(resumeName.isEmpty ? l("No file selected", "Aucun fichier sélectionné") : resumeName)
                                .font(Theme.font(.subheadline))
                                .foregroundStyle(resumeName.isEmpty ? Theme.muted : Theme.ink)
                            Spacer()
                            Button(l("Choose file", "Choisir un fichier")) {
                                showDocumentPicker = true
                            }
                        }
                        errorText("resume")
                    }

                    if let errorMessage {
                        Section {
                            StatusBanner(text: errorMessage, style: .error)
                        }
                    }

                    if let statusMessage {
                        Section {
                            StatusBanner(text: statusMessage, style: .success)
                        }
                    }

                    Section {
                        Button {
                            Task { await submit() }
                        } label: {
                            if isSubmitting {
                                ProgressView()
                            } else {
                                Text(l("Submit Application", "Soumettre la candidature"))
                            }
                        }
                        .buttonStyle(IRefairPrimaryButtonStyle())
                        .disabled(isSubmitting || !networkMonitor.isConnected)
                    }
                    .listRowBackground(Color.clear)
                }
                .navigationTitle(l("Apply", "Postuler"))
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

    private func l(_ en: String, _ fr: String) -> String {
        Localizer.text(en, fr, language: submissionLanguage)
    }

    private func allowedTypes() -> [UTType] {
        var types: [UTType] = [.pdf]
        if let doc = UTType(filenameExtension: "doc") { types.append(doc) }
        if let docx = UTType(filenameExtension: "docx") { types.append(docx) }
        return types
    }

    private func handlePickedFile(_ url: URL) {
        do {
            guard FileSupport.isSupportedResume(url) else {
                let message = l("Resume must be a PDF, DOC, or DOCX file.", "Le CV doit être un fichier PDF, DOC ou DOCX.")
                fieldErrors["resume"] = message
                errorMessage = message
                return
            }
            let data = try FileReader.loadData(from: url)
            guard data.count <= FileSupport.maxResumeSize else {
                let message = l("Resume must be under 10 MB.", "Le CV doit faire moins de 10 Mo.")
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
            errorMessage = l("Unable to load the selected file.", "Impossible de charger le fichier sélectionné.")
        }
    }

    private func validate() -> Bool {
        var errors: [String: String] = [:]
        if applicantId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["applicantId"] = l("Applicant ID is required.", "L'identifiant candidat est requis.")
        }
        if applicantKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["applicantKey"] = l("Applicant key is required.", "La clé du candidat est requise.")
        }
        if iCrn.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["iCrn"] = l("iRCRN is required.", "L'iRCRN est requis.")
        }
        if position.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors["position"] = l("Position is required.", "Le poste est requis.")
        }
        if resumeFile == nil {
            errors["resume"] = l("Please attach a resume.", "Veuillez joindre un CV.")
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
            "language": submissionLanguage,
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
            errorMessage = l("Set your API base URL in Settings first.", "Définissez d'abord l'URL de base de l'API dans Paramètres.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.", "Vous êtes hors ligne. Connectez-vous à Internet et réessayez.")
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
            statusMessage = response.message ?? l("Application submitted successfully.", "Candidature envoyée avec succès.")
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
