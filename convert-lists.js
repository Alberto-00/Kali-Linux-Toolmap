const fs = require('fs');

// Read registry.json
const registryPath = './app/data/registry.json';
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

let casiDusoFixed = 0;
let opsecFixed = 0;
let toolsModified = [];

// Process each tool - ONLY those with the pattern to replace
registry.forEach((tool, index) => {
  if (!tool.desc_long) return;

  const original = tool.desc_long;
  let modified = original;
  let needsFix = false;

  // ONLY process if the specific pattern exists
  const hasCasiDusoPattern = modified.includes("Casi d'uso</h4><p>");
  const hasOpsecPattern = modified.includes("Considerazioni OPSEC</h4><p>");

  if (!hasCasiDusoPattern && !hasOpsecPattern) return;

  // Convert <p> sections after headers to <ul><li> format
  // Pattern: header followed by one or more <p>...</p> until <br><hr>

  if (hasCasiDusoPattern) {
    // Extract the section between "Casi d'uso</h4>" and "<br><hr>"
    const casiMatch = modified.match(/(<h4 class="rt-amber">Casi d'uso<\/h4>)(.*?)(<br><hr>)/s);
    if (casiMatch && casiMatch[2].startsWith('<p>')) {
      const header = casiMatch[1];
      const content = casiMatch[2];
      const ending = casiMatch[3];

      // Extract paragraphs and convert to list items
      const items = [];
      const pRegex = /<p>(.*?)<\/p>/gs;
      let pMatch;

      while ((pMatch = pRegex.exec(content)) !== null) {
        const pContent = pMatch[1];

        // Find <strong>...</strong> patterns and their following text
        const strongRegex = /<strong>([^<]+)<\/strong>/g;
        let strongMatch;
        const strongMatches = [];

        while ((strongMatch = strongRegex.exec(pContent)) !== null) {
          strongMatches.push({
            title: strongMatch[1].replace(/:$/, ''),
            index: strongMatch.index,
            endIndex: strongMatch.index + strongMatch[0].length
          });
        }

        if (strongMatches.length > 0) {
          // Process each strong tag as a list item
          for (let i = 0; i < strongMatches.length; i++) {
            const current = strongMatches[i];
            const next = strongMatches[i + 1];

            // Get description text after the strong tag
            const startPos = current.endIndex;
            const endPos = next ? next.index : pContent.length;
            let desc = pContent.substring(startPos, endPos).trim();

            // Clean up description
            desc = desc.replace(/^[,:\s]+/, '').trim();
            desc = desc.replace(/\.\s*$/, '').trim();

            // Remove common intro words
            desc = desc.replace(/^(è |il |la |lo |un |una |uno |per |che |viene |offre |permette |fornisce |rappresenta |trasforma |analizza |dopo )/i, '');

            if (desc) {
              desc = desc.charAt(0).toUpperCase() + desc.slice(1);
              items.push(`<li><strong>${current.title}:</strong> ${desc}.</li>`);
            }
          }
        }
        // Se non ci sono <strong> tags, NON convertire - lasciare il formato originale
      }

      if (items.length > 0) {
        const newSection = `${header}<ul>${items.join('')}</ul>${ending}`;
        modified = modified.replace(casiMatch[0], newSection);
        casiDusoFixed++;
        needsFix = true;
      }
    }
  }

  if (hasOpsecPattern) {
    // Extract the section between "Considerazioni OPSEC</h4>" and "<br><hr>" or end
    const opsecMatch = modified.match(/(<h4 class="rt-red">Considerazioni OPSEC<\/h4>)(.*?)(<br><hr>|",$)/s);
    if (opsecMatch && opsecMatch[2].startsWith('<p>')) {
      const header = opsecMatch[1];
      const content = opsecMatch[2];
      const ending = opsecMatch[3] === '",' ? '' : opsecMatch[3];

      // Extract paragraphs and convert to list items
      const items = [];
      const pRegex = /<p>(.*?)<\/p>/gs;
      let pMatch;

      while ((pMatch = pRegex.exec(content)) !== null) {
        const pContent = pMatch[1];

        // Find <strong>...</strong> patterns
        const strongRegex = /<strong>([^<]+)<\/strong>/g;
        let strongMatch;
        const strongMatches = [];

        while ((strongMatch = strongRegex.exec(pContent)) !== null) {
          strongMatches.push({
            title: strongMatch[1].replace(/:$/, ''),
            index: strongMatch.index,
            endIndex: strongMatch.index + strongMatch[0].length
          });
        }

        if (strongMatches.length > 0) {
          for (let i = 0; i < strongMatches.length; i++) {
            const current = strongMatches[i];
            const next = strongMatches[i + 1];

            const startPos = current.endIndex;
            const endPos = next ? next.index : pContent.length;
            let desc = pContent.substring(startPos, endPos).trim();

            desc = desc.replace(/^[,:\s]+/, '').trim();
            desc = desc.replace(/\.\s*$/, '').trim();
            desc = desc.replace(/^(è |il |la |lo |un |una |uno |per |che |viene |offre |permette |fornisce |rappresenta |trasforma |analizza )/i, '');

            if (desc) {
              desc = desc.charAt(0).toUpperCase() + desc.slice(1);
              items.push(`<li><strong>${current.title}:</strong> ${desc}.</li>`);
            }
          }
        }
        // Se non ci sono <strong> tags, NON convertire - lasciare il formato originale
      }

      if (items.length > 0) {
        const newSection = `${header}<ul>${items.join('')}</ul>${ending}`;
        modified = modified.replace(opsecMatch[0], newSection);
        opsecFixed++;
        needsFix = true;
      }
    }
  }

  if (needsFix) {
    tool.desc_long = modified;
    toolsModified.push(tool.name);
  }
});

// Write back
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');

console.log(`Fixed ${casiDusoFixed} "Casi d'uso" sections`);
console.log(`Fixed ${opsecFixed} "Considerazioni OPSEC" sections`);
console.log(`Total tools modified: ${toolsModified.length}`);
