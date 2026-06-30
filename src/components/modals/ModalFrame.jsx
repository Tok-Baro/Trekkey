import React from "react";
import { X } from "lucide-react";

export function ModalFrame({ title, description, children, onClose, size }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`modal-panel ${size === "wide" ? "wide-modal" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" type="button" aria-label="모달 닫기" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
