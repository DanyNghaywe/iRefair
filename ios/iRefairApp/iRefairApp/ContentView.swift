import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            if appState.roleMode == nil {
                RoleModeLandingView()
            } else {
                roleBasedTabs
            }
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

    private var roleBasedTabs: some View {
        TabView(
            selection: Binding(
                get: { appState.selectedTab },
                set: { appState.selectTab($0) }
            )
        ) {
            if appState.roleMode == .applicant {
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
            }

            if appState.roleMode == .referrer {
                ReferrerView()
                    .tabItem {
                        Label(l("Referrer"), systemImage: "person.2")
                    }
                    .tag(AppTab.referrer)
            }

            SettingsView()
                .tabItem {
                    Label(l("Settings"), systemImage: "gearshape")
                }
                .tag(AppTab.settings)
        }
        .onAppear {
            appState.ensureValidSelectedTab()
        }
        .onChange(of: appState.roleMode) { _ in
            appState.ensureValidSelectedTab()
        }
    }
}

private struct RoleModeLandingView: View {
    @EnvironmentObject private var appState: AppState

    private let roleOptions: [AppRoleMode] = [.applicant, .referrer]
    private let dropdownItemHeight: CGFloat = 72
    private let dropdownCornerRadius: CGFloat = 20
    private let dropdownDividerHeight: CGFloat = 1

    @State private var selectedRole: AppRoleMode?
    @State private var isDropdownOpen = false
    @State private var hasAcknowledgedPermanentChoice = false
    @State private var showConfirmation = false
    @State private var rolePendingConfirmation: AppRoleMode = .applicant

    var body: some View {
        IRefairScreen {
            IRefairForm {
                IRefairCardHeader(
                    eyebrow: l("Welcome"),
                    title: l("Choose your iRefair mode"),
                    lead: l("Select how you'll use iRefair. This choice is saved on this device and controls which pages open each time.")
                )

                IRefairSection(l("I am a...")) {
                    roleDropdown

                    Toggle(isOn: $hasAcknowledgedPermanentChoice) {
                        Text(l("I confirm my role."))
                            .font(Theme.font(size: 16, weight: .medium))
                            .foregroundStyle(Color.white.opacity(0.9))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .multilineTextAlignment(.trailing)
                    }
                        .tint(Theme.accentPrimary)

                    Button(l("Continue")) {
                        guard let selectedRole else { return }
                        rolePendingConfirmation = selectedRole
                        showConfirmation = true
                    }
                    .buttonStyle(IRefairPrimaryButtonStyle())
                    .disabled(selectedRole == nil || !hasAcknowledgedPermanentChoice)
                }
            }
        }
        .onAppear {
            if selectedRole == nil {
                selectedRole = appState.suggestedRoleMode
            }
        }
        .onChange(of: appState.suggestedRoleMode) { newValue in
            guard selectedRole == nil else { return }
            selectedRole = newValue
        }
        .alert(l("Confirm role selection"), isPresented: $showConfirmation) {
            Button(
                String.localizedStringWithFormat(
                    l("Confirm %@ mode"),
                    roleLabel(rolePendingConfirmation)
                )
            ) {
                appState.commitRoleMode(rolePendingConfirmation)
            }
            Button(l("Go back"), role: .cancel) {}
        } message: {
            Text(
                String.localizedStringWithFormat(
                    l("You selected %@ mode. This choice is saved on this device and controls future app launches."),
                    roleLabel(rolePendingConfirmation)
                )
            )
        }
    }

    private var roleDropdown: some View {
        ZStack(alignment: .top) {
            roleTriggerButton
                .opacity(isDropdownOpen ? 0 : 1)
                .allowsHitTesting(!isDropdownOpen)

            if isDropdownOpen {
                roleDropdownList
                    .transition(.opacity.combined(with: .scale(scale: 0.98, anchor: .top)))
                    .zIndex(2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .frame(height: roleDropdownContainerHeight, alignment: .top)
        .padding(.top, 4)
        .zIndex(isDropdownOpen ? 20 : 1)
    }

    private var roleTriggerButton: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                isDropdownOpen.toggle()
            }
        } label: {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(selectedRole.map(roleLabel) ?? l("Select your role"))
                        .font(Theme.font(size: 17, weight: .semibold))
                        .foregroundStyle(Color.white)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(selectedRole.map(roleDescription) ?? l("Select Applicant or Referrer to continue."))
                        .font(Theme.font(size: 14))
                        .foregroundStyle(Color.white.opacity(0.65))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.72))
                    .frame(width: 18, height: 18)
                    .rotationEffect(.degrees(isDropdownOpen ? 180 : 0))
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .frame(minHeight: dropdownItemHeight)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: dropdownCornerRadius, style: .continuous)
                    .fill(Color.white.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: dropdownCornerRadius, style: .continuous)
                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private var roleDropdownList: some View {
        let shape = RoundedRectangle(cornerRadius: dropdownCornerRadius, style: .continuous)

        return VStack(spacing: 0) {
            ForEach(Array(roleOptions.enumerated()), id: \.element) { index, role in
                roleOptionButton(role)

                if index < roleOptions.count - 1 {
                    Rectangle()
                        .fill(Color.white.opacity(0.15))
                        .frame(height: dropdownDividerHeight)
                }
            }
        }
        .background(
            shape
                .fill(Color.white.opacity(0.12))
        )
        .clipShape(shape)
        .overlay(
            shape.stroke(Color.white.opacity(0.15), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.28), radius: 18, x: 0, y: 10)
    }

    private var roleDropdownListHeight: CGFloat {
        let dividerCount = max(roleOptions.count - 1, 0)
        return (CGFloat(roleOptions.count) * dropdownItemHeight)
            + (CGFloat(dividerCount) * dropdownDividerHeight)
    }

    private var roleDropdownContainerHeight: CGFloat {
        isDropdownOpen ? roleDropdownListHeight : dropdownItemHeight
    }

    private func roleOptionButton(_ role: AppRoleMode) -> some View {
        Button {
            selectedRole = role
            hasAcknowledgedPermanentChoice = false
            withAnimation(.easeInOut(duration: 0.2)) {
                isDropdownOpen = false
            }
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                Text(roleLabel(role))
                    .font(Theme.font(size: 17, weight: .semibold))
                    .foregroundStyle(selectedRole == role ? Color.white : Color.white.opacity(0.7))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(roleDescription(role))
                    .font(Theme.font(size: 14))
                    .foregroundStyle(selectedRole == role ? Color.white.opacity(0.65) : Color.white.opacity(0.6))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 10)
            .frame(minHeight: dropdownItemHeight)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                selectedRole == role ? Color.white.opacity(0.08) : Color.clear
            )
        }
        .buttonStyle(.plain)
    }

    private func roleLabel(_ role: AppRoleMode) -> String {
        switch role {
        case .applicant:
            return l("Applicant")
        case .referrer:
            return l("Referrer")
        }
    }

    private func roleDescription(_ role: AppRoleMode) -> String {
        switch role {
        case .applicant:
            return l("Looking for referrals to Canadian companies.")
        case .referrer:
            return l("Ready to help newcomers get hired.")
        }
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
