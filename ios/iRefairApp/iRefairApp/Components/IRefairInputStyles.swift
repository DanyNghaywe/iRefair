import SwiftUI

private struct IRefairInputFocusedKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var irefairInputFocused: Bool {
        get { self[IRefairInputFocusedKey.self] }
        set { self[IRefairInputFocusedKey.self] = newValue }
    }
}

private struct IRefairInputChrome<Content: View>: View {
    let isFocused: Bool
    let content: Content

    init(isFocused: Bool, @ViewBuilder content: () -> Content) {
        self.isFocused = isFocused
        self.content = content()
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.inputRadius, style: .continuous)
        let fill = isFocused ? Theme.inputBackgroundFocused : Theme.inputBackground
        let border = isFocused ? Theme.inputBorderFocused : Theme.inputBorder
        let borderWidth: CGFloat = isFocused ? 2 : 1

        content
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .background(fill, in: shape)
            .overlay(
                shape.stroke(border, lineWidth: borderWidth)
            )
            .animation(.easeInOut(duration: 0.15), value: isFocused)
    }
}

struct IRefairTextField: View {
    private let title: String
    @Binding private var text: String
    private let axis: Axis

    @FocusState private var isFocused: Bool

    init(_ title: String, text: Binding<String>) {
        self.title = title
        self._text = text
        self.axis = .horizontal
    }

    init(_ title: String, text: Binding<String>, axis: Axis) {
        self.title = title
        self._text = text
        self.axis = axis
    }

    var body: some View {
        Group {
            switch axis {
            case .horizontal:
                SwiftUI.TextField(title, text: $text)
            case .vertical:
                SwiftUI.TextField(title, text: $text, axis: .vertical)
            }
        }
        .focused($isFocused)
        .environment(\.irefairInputFocused, isFocused)
    }
}

struct IRefairSecureField: View {
    private let title: String
    @Binding private var text: String

    @FocusState private var isFocused: Bool

    init(_ title: String, text: Binding<String>) {
        self.title = title
        self._text = text
    }

    var body: some View {
        SecureField(title, text: $text)
            .focused($isFocused)
            .environment(\.irefairInputFocused, isFocused)
    }
}

struct IRefairTextFieldStyle: TextFieldStyle {
    @Environment(\.irefairInputFocused) private var isFocused

    func _body(configuration: TextField<_Label>) -> some View {
        IRefairInputChrome(isFocused: isFocused) {
            configuration
                .foregroundStyle(Theme.ink)
        }
    }
}

struct IRefairInputModifier: ViewModifier {
    func body(content: Content) -> some View {
        IRefairInputChrome(isFocused: false) {
            content
        }
    }
}

extension View {
    func irefairInput() -> some View {
        modifier(IRefairInputModifier())
    }
}

struct IRefairFieldLabel: View {
    let text: String

    var body: some View {
        Text(text)
            .font(Theme.font(size: Theme.fieldLabelFontSize, weight: .semibold))
            .foregroundStyle(Color.white)
            .kerning(Theme.fieldLabelKerning)
            .lineLimit(nil)
            .multilineTextAlignment(.leading)
    }
}

struct IRefairField<Content: View>: View {
    let label: String
    let content: Content

    init(_ label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.fieldLabelGap) {
            IRefairFieldLabel(text: label)
            content
        }
    }
}

struct IRefairPickerLabel: View {
    let text: String
    var isPlaceholder: Bool = false

    var body: some View {
        HStack(spacing: 0) {
            Text(text)
                .font(Theme.font(size: 16))
                .foregroundStyle(Theme.ink)
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer()
            IRefairWebChevron()
        }
    }
}

private struct IRefairSelectInputModifier: ViewModifier {
    let isFocused: Bool

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Theme.inputRadius, style: .continuous)
        let fill = isFocused ? Theme.inputBackgroundFocused : Theme.inputBackground
        let ring = Theme.inputBorderFocused
        let border = Color.white.opacity(0.24)
        content
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 44)
            .background(fill, in: shape)
            .overlay(
                shape.stroke(border, lineWidth: 1)
            )
            .overlay(
                shape.stroke(ring, lineWidth: isFocused ? 2 : 0)
            )
            .animation(.easeInOut(duration: 0.15), value: isFocused)
    }
}

private struct IRefairWebChevron: View {
    var body: some View {
        Path { path in
            path.move(to: CGPoint(x: 2, y: 3))
            path.addLine(to: CGPoint(x: 7, y: 7))
            path.addLine(to: CGPoint(x: 12, y: 3))
        }
        .stroke(
            Color(hex: 0x4B5563),
            style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round)
        )
        .frame(width: 14, height: 10)
        .accessibilityHidden(true)
    }
}

extension View {
    func irefairSelectInput(isFocused: Bool = false) -> some View {
        modifier(IRefairSelectInputModifier(isFocused: isFocused))
    }
}

struct IRefairMenuPicker<SelectionValue: Hashable, Content: View>: View {
    let title: String
    let displayValue: String
    let isPlaceholder: Bool
    @Binding var selection: SelectionValue
    let content: Content
    @State private var showsFocusState = false
    @State private var focusResetTask: Task<Void, Never>?

    init(_ title: String, displayValue: String, isPlaceholder: Bool = false, selection: Binding<SelectionValue>, @ViewBuilder content: () -> Content) {
        self.title = title
        self.displayValue = displayValue
        self.isPlaceholder = isPlaceholder
        self._selection = selection
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.fieldLabelGap) {
            IRefairFieldLabel(text: title)
            Menu {
                Picker(selection: $selection) {
                    content
                } label: {
                    EmptyView()
                }
            } label: {
                IRefairPickerLabel(text: displayValue, isPlaceholder: isPlaceholder)
                    .irefairSelectInput(isFocused: showsFocusState)
            }
            .menuIndicator(.hidden)
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)
            .simultaneousGesture(
                TapGesture().onEnded {
                    activateFocusState()
                }
            )
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(title)
            .accessibilityValue(displayValue)
        }
        .onChange(of: selection) { _ in
            deactivateFocusState()
        }
        .onDisappear {
            focusResetTask?.cancel()
            focusResetTask = nil
        }
    }

    private func activateFocusState() {
        focusResetTask?.cancel()
        showsFocusState = true
        focusResetTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            showsFocusState = false
            focusResetTask = nil
        }
    }

    private func deactivateFocusState() {
        focusResetTask?.cancel()
        focusResetTask = nil
        showsFocusState = false
    }
}

struct IRefairGhostButtonStyle: ButtonStyle {
    let fillWidth: Bool

    init(fillWidth: Bool = false) {
        self.fillWidth = fillWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        let isPressed = configuration.isPressed

        configuration.label
            .font(Theme.font(size: 14, weight: .bold))
            .foregroundStyle(Color.white)
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .frame(minHeight: 44)
            .frame(maxWidth: fillWidth ? .infinity : nil)
            .background(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.white.opacity(isPressed ? 0.1 : 0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.white.opacity(0.25), lineWidth: 1)
                    )
            )
            .shadow(color: Color(hex: 0x0F172A).opacity(0.08), radius: 10, x: 0, y: isPressed ? 4 : 6)
            .scaleEffect(isPressed ? 0.99 : 1)
            .opacity(isPressed ? 0.96 : 1)
    }
}

struct IRefairCheckboxToggleStyle: ToggleStyle {
    let labelColor: Color
    let labelFont: Font
    let labelKerning: CGFloat
    let verticalAlignment: VerticalAlignment
    let uncheckedFillColor: Color
    let uncheckedBorderColor: Color

    init(
        labelColor: Color = Color.white.opacity(0.9),
        labelFont: Font = Theme.font(.subheadline),
        labelKerning: CGFloat = 0,
        verticalAlignment: VerticalAlignment = .top,
        uncheckedFillColor: Color = Color.white.opacity(0.12),
        uncheckedBorderColor: Color = Color.white.opacity(0.35)
    ) {
        self.labelColor = labelColor
        self.labelFont = labelFont
        self.labelKerning = labelKerning
        self.verticalAlignment = verticalAlignment
        self.uncheckedFillColor = uncheckedFillColor
        self.uncheckedBorderColor = uncheckedBorderColor
    }

    func makeBody(configuration: Configuration) -> some View {
        Button(action: { configuration.isOn.toggle() }) {
            HStack(alignment: verticalAlignment, spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(configuration.isOn ? Theme.accentPrimary : uncheckedFillColor)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .stroke(configuration.isOn ? .clear : uncheckedBorderColor, lineWidth: 1)
                        )
                    if configuration.isOn {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color.white)
                    }
                }
                .frame(width: 20, height: 20)

                configuration.label
                    .foregroundStyle(labelColor)
                    .font(labelFont)
                    .kerning(labelKerning)
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
    }
}
