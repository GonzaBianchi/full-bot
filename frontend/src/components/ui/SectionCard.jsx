// frontend/src/components/ui/SectionCard.jsx
export function SectionCard({ icon: Icon, iconBgColor, iconColor, title, description, children }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-start space-x-4">
        {Icon && (
          <div className={`${iconBgColor} p-3 rounded-lg`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
        <div className="flex-1">
          {title && <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>}
          {description && (
            <p className="text-gray-400 text-sm mb-4">{description}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}