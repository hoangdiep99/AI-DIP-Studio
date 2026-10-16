import React from 'react';

// Component accordion dùng chung: thu gọn các nhóm tuỳ chọn để form không bị quá dài,
// giúp người dùng không phải cuộn lên xuống nhiều lần khi chọn chức năng rồi bấm nút submit.
const AccordionSection = ({ id, icon, title, summary, openSections, onToggle, children }) => {
  const isOpen = !!openSections[id];
  return (
    <div className={'panel-section accordion-section' + (isOpen ? ' open' : '')}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="accordion-title">
          <span className="accordion-icon">{icon}</span>
          <span>{title}</span>
        </span>
        <span className="accordion-summary">{summary}</span>
        <span className="accordion-chevron">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default AccordionSection;
