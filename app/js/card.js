// ====== JS minimo per applicare la logica getPhaseColor (da ToolCard.tsx) ======
function getPhaseColor(phase) {
    phase = String(phase || "");
    if (phase.includes("Common")) return "hsl(261 84% 70%)"; // viola
    if (phase.includes("Information")) return "hsl(217 91% 68%)"; // blu
    if (phase.includes("Exploitation")) return "hsl(0 84% 60%)";   // rosso
    if (phase.includes("Post")) return "hsl(38 92% 60%)";  // arancio
    return "hsl(160 84% 52%)";                                  // verde (default)
}

function phaseLabel(phase) {
    return String(phase || "").replace(/^\d+_/, "").replace(/_/g, " ");
}

// Hydrate: riempie i campi dalla data-* e applica gli stili dinamici
document.querySelectorAll('.tool-card').forEach(card => {
    const name = card.getAttribute('data-name') || 'Tool Name';
    const desc = card.getAttribute('data-desc') || 'Tool description…';
    const phase = card.getAttribute('data-phase') || 'Common';
    const repo = card.getAttribute('data-repo') || '#';

    card.querySelector('.tool-title').textContent = name;
    card.querySelector('.tool-desc').textContent = desc;

    const badge = card.querySelector('.phase-badge');
    const color = getPhaseColor(phase);
    badge.textContent = phaseLabel(phase);
    badge.style.backgroundColor = color.replace(')', ' / 0.13)');
    badge.style.color = color;

    // Ombra dell’icona tonalizzata come nell’originale
    const icon = card.querySelector('[data-shadow]');
    icon.style.boxShadow = `0 4px 12px ${color}33`;

    // Repo button URL
    card.querySelector('[data-repo-btn]').setAttribute('href', repo);

    // Click sull’intera card
    card.addEventListener('click', e => {
        // se il click viene da un bottone/link interno, non navigare
        if (e.target.closest('.actions')) return;
        window.open(repo, '_blank', 'noopener');
    });

    // Notes click (callback equivalente a onNotesClick)
    card.querySelector('[data-notes-btn]').addEventListener('click', e => {
        e.stopPropagation();
        alert(`Notes for: ${name}\n\n(qui puoi aprire un modal o side-panel)`);
    });
});

