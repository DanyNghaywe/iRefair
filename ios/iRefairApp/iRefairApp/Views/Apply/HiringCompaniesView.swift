import SwiftUI

struct HiringCompaniesView: View {
    private let apiBaseURL: String = APIConfig.baseURL

    @EnvironmentObject private var networkMonitor: NetworkMonitor
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var companies: [HiringCompany] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var hasLoaded = false
    @State private var currentPage = 1
    @State private var showCareersWarning = false
    @State private var selectedCareersUrl: URL?

    private let pageSize = 20
    private let loadingRows = 1

    var body: some View {
        IRefairScreen {
            IRefairForm {
                VStack(alignment: .leading, spacing: 12) {
                    IRefairCardHeader(
                        eyebrow: l("Hiring now"),
                        title: l("Hiring companies & iRCRN list"),
                        lead: l("Follow these steps to find a suitable role and submit your application through iRefair.")
                    )
                    stepsList
                }

                if !networkMonitor.isConnected {
                    IRefairSection {
                        StatusBanner(text: l("You're offline. Connect to the internet and try again."), style: .warning)
                    }
                }

                if isLoading {
                    loadingTableView
                } else if !paginatedCompanies.isEmpty {
                    HiringTableContainer(border: tableBorder, fill: tableFill) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(l("iRCRN company list"))
                                .font(Theme.font(.caption, weight: .semibold))
                                .foregroundStyle(lightMutedText)
                                .textCase(.uppercase)
                                .kerning(1.4)
                            LazyVStack(alignment: .leading, spacing: 0) {
                                ForEach(Array(paginatedCompanies.enumerated()), id: \.element.id) { index, company in
                                    VStack(alignment: .leading, spacing: 12) {
                                        labeledValue(title: l("iRCRN"), value: company.code)
                                        labeledValue(title: l("Company Name"), value: company.name)
                                        labeledValue(title: l("Industry"), value: company.industry)
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(l("Careers website"))
                                                .font(Theme.font(.caption, weight: .semibold))
                                                .foregroundStyle(lightMutedText)
                                            if let careersLink = normalizedCareersUrl(from: company) {
                                                Button {
                                                    selectedCareersUrl = careersLink
                                                    showCareersWarning = true
                                                } label: {
                                                    Text(l("Open careers website"))
                                                }
                                                .buttonStyle(HiringLinkButtonStyle(color: linkText, weight: .medium))
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                                .accessibilityLabel(l("Open careers website"))
                                            } else {
                                                Text(l("Not provided yet"))
                                                    .font(Theme.font(.caption))
                                                    .foregroundStyle(lightFaintText)
                                                    .italic()
                                            }
                                        }
                                    }
                                    .padding(.vertical, 10)
                                    .padding(.horizontal, 10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(index.isMultiple(of: 2) ? rowTint : Color.clear)
                                    if index < paginatedCompanies.count - 1 {
                                        Divider()
                                            .background(dividerTone)
                                    }
                                }
                            }
                            if totalPages > 1 {
                                paginationView
                            }
                            Text(l("iRCRN: iRefair Company Reference Number"))
                                .font(Theme.font(.caption))
                                .foregroundStyle(lightFaintText)
                        }
                    }
                } else {
                    IRefairSection {
                        Text(l("No companies available yet."))
                            .foregroundStyle(lightFaintText)
                    }
                }

                if let errorMessage {
                    IRefairSection {
                        StatusBanner(text: errorMessage, style: .error)
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    followUpText
                        .font(Theme.font(.subheadline))
                        .foregroundStyle(lightText)
                    Button {
                        dismiss()
                    } label: {
                        Text(l("Apply Now"))
                    }
                    .buttonStyle(HiringLinkButtonStyle(color: linkText, weight: .bold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Text(l("We wish you success with your applications."))
                        .font(Theme.font(.caption))
                        .foregroundStyle(lightFaintText)
                }
            }
            .task {
                guard !hasLoaded else { return }
                hasLoaded = true
                await loadCompanies()
            }
            .confirmationDialog(l("Before you go"), isPresented: $showCareersWarning, titleVisibility: .visible) {
                Button(l("View Careers")) {
                    guard let url = selectedCareersUrl else { return }
                    openURL(url)
                    selectedCareersUrl = nil
                }
                Button(l("Apply Now")) {
                    selectedCareersUrl = nil
                    dismiss()
                }
                Button(l("Cancel"), role: .cancel) {
                    selectedCareersUrl = nil
                }
            } message: {
                Text(careersWarningMessage)
            }
            .onChange(of: showCareersWarning) { isPresented in
                if !isPresented {
                    selectedCareersUrl = nil
                }
            }
        }
    }

    private var steps: [String] {
        [
            l("Review the companies listed in the table below."),
            l("Open the careers website of the company you are interested in."),
            l("Choose the position you want to apply for and note the company iRCRN."),
            l("Complete the Apply Now form on the iRefair website using your iRAIN and the company iRCRN. Do not apply directly on the company website."),
        ]
    }

    private var totalPages: Int {
        guard !companies.isEmpty else { return 0 }
        return Int(ceil(Double(companies.count) / Double(pageSize)))
    }

    private var validPage: Int {
        guard totalPages > 0 else { return 1 }
        return min(max(1, currentPage), totalPages)
    }

    private var paginatedCompanies: [HiringCompany] {
        guard totalPages > 0 else { return [] }
        let startIndex = (validPage - 1) * pageSize
        let endIndex = min(startIndex + pageSize, companies.count)
        return Array(companies[startIndex..<endIndex])
    }

    private var followUpText: Text {
        Text(l("Once you have identified a suitable vacancy, keep the company ")) +
            Text("iRCRN").bold() +
            Text(l(" and your ")) +
            Text("iRAIN").bold() +
            Text(l(" ready, then submit your application through the ")) +
            Text(l("Apply Now")).bold() +
            Text(l(" page on iRefair."))
    }

    private var stepsList: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                HStack(alignment: .top, spacing: 10) {
                    Text("\(index + 1).")
                        .font(Theme.font(.caption, weight: .semibold))
                        .foregroundStyle(lightMutedText)
                        .frame(width: 20, alignment: .leading)
                    Text(step)
                        .font(Theme.font(.subheadline))
                        .foregroundStyle(lightText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding(.top, 4)
    }

    private var paginationView: some View {
        HStack(spacing: 12) {
            paginationButton("«", label: l("Go to first page"), disabled: validPage == 1) {
                currentPage = 1
            }
            paginationButton("‹", label: l("Go to previous page"), disabled: validPage == 1) {
                currentPage = max(1, validPage - 1)
            }
            Text(String(format: l("Page %d of %d"), validPage, totalPages))
                .font(Theme.font(.caption, weight: .semibold))
                .foregroundStyle(lightMutedText)
                .frame(maxWidth: .infinity)
            paginationButton("›", label: l("Go to next page"), disabled: validPage == totalPages) {
                currentPage = min(totalPages, validPage + 1)
            }
            paginationButton("»", label: l("Go to last page"), disabled: validPage == totalPages) {
                currentPage = totalPages
            }
        }
    }

    private var loadingTableView: some View {
        HiringTableContainer(border: tableBorder, fill: tableFill) {
            VStack(alignment: .leading, spacing: 12) {
                Text(l("iRCRN company list"))
                    .font(Theme.font(.caption, weight: .semibold))
                    .foregroundStyle(lightMutedText)
                    .textCase(.uppercase)
                    .kerning(1.4)
                LazyVStack(alignment: .leading, spacing: 0) {
                    ForEach(0..<loadingRows, id: \.self) { index in
                        loadingRow(index: index)
                    }
                }
                IRefairSkeletonBlock(width: 170, height: 12, cornerRadius: 999)
                    .frame(maxWidth: .infinity)
                Text(l("iRCRN: iRefair Company Reference Number"))
                    .font(Theme.font(.caption))
                    .foregroundStyle(lightFaintText)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(l("Loading..."))
    }

    @ViewBuilder
    private func loadingRow(index: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            loadingLabeledValue(titleWidth: 56, valueWidth: 92, delay: 0.03)
            loadingLabeledValue(titleWidth: 108, valueWidth: 220, delay: 0.06)
            loadingLabeledValue(titleWidth: 74, valueWidth: 180, delay: 0.09)
            VStack(alignment: .leading, spacing: 6) {
                IRefairSkeletonBlock(width: 108, height: 10, cornerRadius: 999, delay: 0.11)
                IRefairSkeletonBlock(width: 156, height: 16, cornerRadius: 8, delay: 0.14)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(index.isMultiple(of: 2) ? rowTint : Color.clear)

        if index < loadingRows - 1 {
            Divider()
                .background(dividerTone)
        }
    }

    private func loadingLabeledValue(titleWidth: CGFloat, valueWidth: CGFloat, delay: Double) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            IRefairSkeletonBlock(width: titleWidth, height: 10, cornerRadius: 999, delay: delay)
            IRefairSkeletonBlock(width: valueWidth, height: 14, cornerRadius: 8, delay: delay + 0.02)
        }
    }

    @ViewBuilder
    private func labeledValue(title: String, value: String, valueColor: Color? = nil) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(Theme.font(.caption, weight: .semibold))
                .foregroundStyle(lightMutedText)
            Text(value)
                .font(Theme.font(.subheadline, weight: .semibold))
                .foregroundStyle(valueColor ?? lightText)
        }
    }

    private func normalizedCareersUrl(from company: HiringCompany) -> URL? {
        guard let urlString = company.careersUrl?.trimmingCharacters(in: .whitespacesAndNewlines), !urlString.isEmpty else {
            return nil
        }
        let lowercased = urlString.lowercased()
        if lowercased.hasPrefix("http://") || lowercased.hasPrefix("https://") {
            return URL(string: urlString)
        }
        return URL(string: "https://\(urlString)")
    }

    private func l(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }

    private var careersWarningMessage: String {
        [
            l("Use the careers page only to find positions you're interested in."),
            l("Applying directly on the company's website will NOT get you a referral."),
            l("Return to iRefair and use the Apply page to submit your application."),
        ]
            .joined(separator: "\n\n")
    }

    private func paginationButton(_ title: String, label: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(Theme.font(.subheadline, weight: .semibold))
                .foregroundStyle(Color.white)
                .frame(width: 36, height: 36)
                .background(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.white.opacity(disabled ? 0.08 : 0.14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(Color.white.opacity(disabled ? 0.12 : 0.28), lineWidth: 1)
                        )
                )
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.6 : 1)
        .accessibilityLabel(label)
    }

    private var lightText: Color {
        Color.white.opacity(0.92)
    }

    private var lightMutedText: Color {
        Color.white.opacity(0.78)
    }

    private var lightFaintText: Color {
        Color.white.opacity(0.85)
    }

    private var linkText: Color {
        Color(hex: 0xE0F2FF)
    }

    private var dividerTone: Color {
        Color.white.opacity(0.12)
    }

    private var tableBorder: Color {
        Color.white.opacity(0.16)
    }

    private var tableFill: Color {
        Color.white.opacity(0.02)
    }

    private var rowTint: Color {
        Color.white.opacity(0.06)
    }

    @MainActor
    private func loadCompanies() async {
        errorMessage = nil
        guard !Validator.sanitizeBaseURL(apiBaseURL).isEmpty else {
            errorMessage = l("App configuration is missing API base URL.")
            return
        }
        guard networkMonitor.isConnected else {
            errorMessage = l("You're offline. Connect to the internet and try again.")
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response = try await APIClient.loadHiringCompanies(baseURL: apiBaseURL)
            let items = response.companies ?? []
            companies = items.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            currentPage = 1
            Telemetry.track("hiring_companies_loaded", properties: ["count": "\(companies.count)"])
        } catch {
            Telemetry.capture(error)
            errorMessage = error.localizedDescription
        }
    }
}

private struct HiringLinkButtonStyle: ButtonStyle {
    let color: Color
    let weight: Font.Weight

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.font(.subheadline, weight: weight))
            .foregroundStyle(configuration.isPressed ? Color.white : color)
            .underline()
            .padding(.vertical, 2)
            .opacity(configuration.isPressed ? 0.9 : 1)
    }
}

private struct HiringTableContainer<Content: View>: View {
    let border: Color
    let fill: Color
    let content: Content

    init(border: Color, fill: Color, @ViewBuilder content: () -> Content) {
        self.border = border
        self.fill = fill
        self.content = content()
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)
        VStack(alignment: .leading, spacing: 0) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .background(
            shape
                .fill(fill)
                .overlay(shape.stroke(border, lineWidth: 1))
        )
        .clipShape(shape)
    }
}

#Preview {
    HiringCompaniesView()
        .environmentObject(NetworkMonitor())
}
