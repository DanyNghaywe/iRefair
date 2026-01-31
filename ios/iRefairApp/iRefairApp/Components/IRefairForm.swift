import SwiftUI

struct IRefairForm<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            IRefairBoardBackground()
            Form {
                content
            }
            .scrollContentBackground(.hidden)
            .listStyle(.insetGrouped)
            .listRowBackground(Color.clear)
            .listRowSeparatorTint(Theme.line.opacity(0.6))
            .foregroundStyle(Theme.ink)
            .background(Color.clear)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .clipShape(RoundedRectangle(cornerRadius: Theme.boardRadius, style: .continuous))
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}
