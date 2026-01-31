import SwiftUI

struct IRefairTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.inputRadius, style: .continuous)
        configuration
            .foregroundStyle(Theme.ink)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .background(Theme.inputBackground, in: shape)
            .background(.ultraThinMaterial, in: shape)
            .overlay(
                shape.stroke(Theme.inputBorder, lineWidth: 1)
            )
    }
}

struct IRefairInputModifier: ViewModifier {
    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.inputRadius, style: .continuous)
        content
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .background(Theme.inputBackground, in: shape)
            .background(.ultraThinMaterial, in: shape)
            .overlay(
                shape.stroke(Theme.inputBorder, lineWidth: 1)
            )
    }
}

extension View {
    func irefairInput() -> some View {
        modifier(IRefairInputModifier())
    }
}

struct IRefairPickerLabel: View {
    let text: String
    var isPlaceholder: Bool = false

    var body: some View {
        HStack(spacing: 8) {
            Text(text)
                .foregroundStyle(isPlaceholder ? Theme.muted : Theme.ink)
                .lineLimit(1)
                .truncationMode(.tail)
            Spacer()
            Image(systemName: "chevron.down")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.muted)
        }
    }
}

struct IRefairMenuPicker<SelectionValue: Hashable, Content: View>: View {
    let title: String
    let displayValue: String
    let isPlaceholder: Bool
    @Binding var selection: SelectionValue
    let content: Content

    init(_ title: String, displayValue: String, isPlaceholder: Bool = false, selection: Binding<SelectionValue>, @ViewBuilder content: () -> Content) {
        self.title = title
        self.displayValue = displayValue
        self.isPlaceholder = isPlaceholder
        self._selection = selection
        self.content = content()
    }

    var body: some View {
        Picker(selection: $selection) {
            content
        } label: {
            IRefairPickerLabel(text: displayValue, isPlaceholder: isPlaceholder)
        }
        .pickerStyle(.menu)
        .irefairInput()
        .buttonStyle(.plain)
        .accessibilityLabel(title)
    }
}

struct IRefairGhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.font(.subheadline, weight: .semibold))
            .foregroundStyle(Color.white)
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(configuration.isPressed ? 0.1 : 0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.white.opacity(0.25), lineWidth: 1)
                    )
            )
            .shadow(color: Color(hex: 0x0F172A).opacity(0.08), radius: 10, x: 0, y: 6)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
    }
}

struct IRefairCheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button(action: { configuration.isOn.toggle() }) {
            HStack(alignment: .top, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(configuration.isOn ? Theme.accentPrimary : Color.white.opacity(0.12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .stroke(Color.white.opacity(configuration.isOn ? 0.0 : 0.35), lineWidth: 1)
                        )
                    if configuration.isOn {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.white)
                    }
                }
                .frame(width: 20, height: 20)

                configuration.label
                    .foregroundStyle(Color.white.opacity(0.9))
                    .font(Theme.font(.subheadline))
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }
}
