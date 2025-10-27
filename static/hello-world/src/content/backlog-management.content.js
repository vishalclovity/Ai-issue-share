// Language packs for AI Issue Share app

const en = {
  heroTitle: "Welcome to AI Issue Share",
  heroSubtitle: "Write a prompt, pick Jira issues, and send a secure, redacted email summary.",
  specRows: [
    {
      id: "solves", label: "What it solves:", links: [
        "Secure external sharing of Jira issues, less copy–paste, aligned stakeholders, vendor collaboration, and audit-ready trails."
      ]
    },
    {
      id: "who", label: "Who it’s for:", links: [
        "PM/Program, Product, Engineering/Architecture, QA/Support, Vendors, Clients, and Auditors."
      ]
    },
    {
      id: "inside", label: "What’s inside:", links: [
        "Prompts, Templates, Redaction rules, Recipients, Access controls, Secure links, Attachments, Audit logs."
      ]
    },
    {
      id: "ai", label: "AI in action:", links: [
        "Natural-language selection, auto-redaction, smart summaries, role-based views, and prompt-to-email."
      ]
    },
    {
      id: "build", label: "Build & integrate faster:", links: [
        "Jira API scopes & webhooks, prompt patterns, SMTP/SendGrid/O365 setup, secure link service, data mapping."
      ]
    },
    {
      id: "measure", label: "Measure impact:", links: [
        "Deliverability, opens/clicks, link views, share latency, response SLA, and audit events."
      ]
    },
  ],
  ctas: {
    run: "Open AI Issue Share",
    rescan: "Reselect Issues",
    analyze: "Preview Email",
    moreApps: "More from Us",
    contactUs: "Get in touch",
  },
  moreApps: {
    title: "More Apps from Us",
    subtitle: "Discover additional workflows and utilities",
    drawerTitle: "More Apps from Us",
    featuredTitle: "Featured",
    footer: "Crafted with ❤️ by the team"
  },
  assistant: {
    title: "Welcome to Issue Share Assistant",
    subtitle: "Share Jira issues with redaction, access control, and tracking — from one prompt.",
    quickActions: [
  { id: "open_last7", label: "Open issues (last 7 days)", icon: "users"},
  { id: "unassigned_open", label: "Unassigned open issues", icon: "users"},
  { id: "bugs_today", label: "Bugs updated today", icon: "activity"},
  { id: "overdue_tasks", label: "Overdue tasks", icon: "calendar"},
],
    inputPlaceholder: "Describe what to share (e.g., “Send blockers to Acme vendor”)",
  },
  chat: {
    suggestionsTitle: "Suggested follow-up questions:",
    followUps: [
      "Should I redact emails, phone numbers, and internal links?",
      "Include latest comments and attach a CSV export as well?"
    ],
    networkErrorTitle: "Network error: Unable to reach Jira or the email service.",
    networkErrorHint: "Please check Jira connectivity and outbound email configuration.",
    needMoreHelp: "Need more help?",
    contactUs: "Contact Us",
    waitingMessages: [
      "✉️ Composing the email body…",
      "🔐 Applying redaction rules…",
      "🧭 Resolving JQL and filters…",
      "📌 Collecting selected issues…",
      "🧾 Formatting fields and tables…",
      "🔗 Generating a secure share link…",
      "📎 Attaching CSV/PDF artifacts…",
      "🕵️ Scanning for sensitive data…",
      "🗂️ Grouping by epic and status…",
      "🧠 Summarizing key risks and blockers…",
      "✅ Checking recipient permissions…",
      "📬 Queuing the message for delivery…",
      "📈 Embedding metrics and counts…",
      "🪪 Tagging the share for audit logs…",
      "⏳ Estimating link expiry and access…",
      "🚦 Validating rate limits and quotas…",
      "🛡️ Signing the one-time access URL…",
      "🚀 Sending via configured mail provider…",
      "🔍 Verifying delivery status…",
      "📚 Recording share event for analytics…"
    ]
  },
  labels: {
    lastScanned: "Last shared:",
    scanningProgress: "Packaging item {current} of {total}."
  },
  defaultRetry: {
    retryMessage: "Hmm, I couldn’t complete that. Could you try your request again?"
  },
  ragRetry: {
    retryMessageRag: "I couldn’t find matching items for that prompt. Please refine the wording or specify a project/label."
  },
};

const fr = {
  heroTitle: "Bienvenue dans AI Issue Share",
  heroSubtitle: "Écrivez un prompt, sélectionnez des tickets Jira et envoyez un e-mail sécurisé avec anonymisation.",
  specRows: [
    {
      id: "solves", label: "Ce que cela résout :", links: [
        "Partage externe sécurisé des tickets Jira, moins de copier-coller, alignement des parties prenantes, collaboration fournisseurs, traçabilité d’audit."
      ]
    },
    {
      id: "who", label: "Pour qui :", links: [
        "PM/PMO, Produit, Ingénierie/Architecture, QA/Support, Clients, Fournisseurs et Auditeurs."
      ]
    },
    {
      id: "inside", label: "Ce que contient l’outil :", links: [
        "Prompts, Modèles, Règles d’anonymisation, Destinataires, Contrôles d’accès, Liens sécurisés, Pièces jointes, Journaux d’audit."
      ]
    },
    {
      id: "ai", label: "IA en action :", links: [
        "Sélection en langage naturel, auto-anonymisation, résumés intelligents, vues par rôle et prompt→e-mail."
      ]
    },
    {
      id: "build", label: "Concevez & intégrez plus vite :", links: [
        "Scopes & webhooks Jira, patterns de prompts, configuration SMTP/SendGrid/O365, service de lien sécurisé, mapping de données."
      ]
    },
    {
      id: "measure", label: "Mesurez l’impact :", links: [
        "Délivrabilité, ouvertures/clics, vues de lien, latence d’envoi, SLA de réponse, événements d’audit."
      ]
    },
  ],
  ctas: {
    run: "Ouvrir AI Issue Share",
    rescan: "Resélectionner les tickets",
    analyze: "Prévisualiser l’e-mail",
    moreApps: "Plus de notre part",
    contactUs: "Nous contacter",
  },
  moreApps: {
    title: "Plus d'Apps de Notre Part",
    subtitle: "Découvrez d’autres workflows et utilitaires",
    drawerTitle: "Plus d'Apps de Notre Part",
    featuredTitle: "À la une",
    footer: "Créé avec ❤️ par l’équipe"
  },
  assistant: {
    title: "Bienvenue dans l’Assistant Issue Share",
    subtitle: "Partage de tickets, anonymisation, contrôle d’accès et suivi — via un seul prompt.",
    quickActions: [
      { id: "sprint_summary", label: "Partager le résumé du sprint", icon: "activity" },
      { id: "vendor_blockers", label: "Envoyer les bloqueurs au fournisseur", icon: "alert-circle" },
      { id: "unassigned_mail", label: "Mailer les tickets non assignés", icon: "users" },
      { id: "weekly_client", label: "Statut hebdo client", icon: "calendar" },
    ],
    inputPlaceholder: "Décrivez ce que vous voulez partager (ex. « Envoyer les bloqueurs à Acme »)",
  },
  chat: {
    suggestionsTitle: "Suggestions de questions de suivi :",
    followUps: [
      "Faut-il anonymiser les e-mails, numéros et liens internes ?",
      "Inclure les derniers commentaires et joindre un export CSV ?"
    ],
    networkErrorTitle: "Erreur réseau : impossible d’atteindre Jira ou le service e-mail.",
    networkErrorHint: "Vérifiez la connectivité à Jira et la configuration de l’e-mail sortant.",
    needMoreHelp: "Besoin d’aide ?",
    contactUs: "Nous contacter",
    waitingMessages: [
      "✉️ Rédaction du corps de l’e-mail…",
      "🔐 Application des règles d’anonymisation…",
      "🧭 Résolution du JQL et des filtres…",
      "📌 Collecte des tickets sélectionnés…",
      "🧾 Mise en forme des tableaux…",
      "🔗 Génération du lien sécurisé…",
      "📎 Ajout des pièces jointes (CSV/PDF)…",
      "🕵️ Détection de données sensibles…",
      "🗂️ Groupement par epic et statut…",
      "🧠 Résumé des risques et bloqueurs…",
      "✅ Vérification des destinataires…",
      "📬 Mise en file d’envoi…"
    ]
  },
  labels: {
    lastScanned: "Dernier partage :",
    scanningProgress: "Préparation de l’élément {current} sur {total}."
  },
  defaultRetry: {
    retryMessage: "Hum, je n’ai pas pu terminer l’opération. Pouvez-vous réessayer ?"
  },
  ragRetry: {
    retryMessageRag: "Je n’ai rien trouvé pour ce prompt. Précisez le projet/label ou reformulez."
  },
};

const es = {
  heroTitle: "Bienvenido a AI Issue Share",
  heroSubtitle: "Escribe un prompt, elige incidencias de Jira y envía un correo seguro con anonimización.",
  specRows: [
    {
      id: "solves", label: "Qué resuelve:", links: [
        "Compartir externamente datos de Jira de forma segura, menos copiar-pegar, alineación de interesados, colaboración con proveedores y trazabilidad de auditoría."
      ]
    },
    {
      id: "who", label: "Para quién:", links: [
        "PM/Programa, Producto, Ingeniería/Arquitectura, QA/Soporte, Clientes, Proveedores y Auditores."
      ]
    },
    {
      id: "inside", label: "Qué incluye:", links: [
        "Prompts, Plantillas, Reglas de redacción/anonimización, Destinatarios, Controles de acceso, Enlaces seguros, Adjuntos, Registros de auditoría."
      ]
    },
    {
      id: "ai", label: "IA en acción:", links: [
        "Selección en lenguaje natural, auto-anonimización, resúmenes inteligentes, vistas por rol y de prompt a e-mail."
      ]
    },
    {
      id: "build", label: "Crea e integra más rápido:", links: [
        "Permisos y webhooks de la API de Jira, patrones de prompt, configuración SMTP/SendGrid/O365, servicio de enlace seguro, mapeo de datos."
      ]
    },
    {
      id: "measure", label: "Mide el impacto:", links: [
        "Entregabilidad, aperturas/clics, vistas de enlace, latencia de envío, SLA de respuesta y eventos de auditoría."
      ]
    },
  ],
  ctas: {
    run: "Abrir AI Issue Share",
    rescan: "Volver a seleccionar",
    analyze: "Previsualizar correo",
    moreApps: "Más de nosotros",
    contactUs: "Ponte en contacto",
  },
  moreApps: {
    title: "Más Apps Nuestras",
    subtitle: "Descubre flujos y utilidades adicionales",
    drawerTitle: "Más Apps Nuestras",
    featuredTitle: "Destacados",
    footer: "Hecho con ❤️ por el equipo"
  },
  assistant: {
    title: "Bienvenido al Asistente de Issue Share",
    subtitle: "Comparte incidencias de Jira con anonimización, control de acceso y seguimiento — desde un prompt.",
    quickActions: [
      { id: "sprint_summary", label: "Compartir resumen del sprint", icon: "activity" },
      { id: "vendor_blockers", label: "Enviar bloqueadores al proveedor", icon: "alert-circle" },
      { id: "unassigned_mail", label: "Enviar incidencias sin asignar", icon: "users" },
      { id: "weekly_client", label: "Estado semanal al cliente", icon: "calendar" },
    ],
    inputPlaceholder: "Describe qué compartir (p. ej., “Enviar bloqueadores a Acme”)",
  },
  chat: {
    suggestionsTitle: "Preguntas de seguimiento sugeridas:",
    followUps: [
      "¿Debo anonimizar correos, teléfonos y enlaces internos?",
      "¿Incluyo los últimos comentarios y adjunto un CSV?"
    ],
    networkErrorTitle: "Error de red: no se puede acceder a Jira o al servicio de correo.",
    networkErrorHint: "Verifica la conectividad con Jira y la configuración del correo saliente.",
    needMoreHelp: "¿Necesitas más ayuda?",
    contactUs: "Ponte en contacto",
    waitingMessages: [
      "✉️ Redactando el cuerpo del correo…",
      "🔐 Aplicando reglas de anonimización…",
      "🧭 Resolviendo JQL y filtros…",
      "📌 Reuniendo las incidencias seleccionadas…",
      "🧾 Formateando tablas y campos…",
      "🔗 Generando enlace seguro…",
      "📎 Adjuntando CSV/PDF…",
      "🕵️ Buscando datos sensibles…",
      "🗂️ Agrupando por épica y estado…",
      "🧠 Resumiendo riesgos y bloqueadores…",
      "✅ Comprobando destinatarios…",
      "📬 Enviando mediante el proveedor configurado…"
    ]
  },
  labels: {
    lastScanned: "Último envío:",
    scanningProgress: "Empaquetando el elemento {current} de {total}."
  },
  defaultRetry: {
    retryMessage: "Mmm, no pude completar la acción. ¿Podrías intentarlo de nuevo?"
  },
  ragRetry: {
    retryMessageRag: "No encontré elementos que coincidan con ese prompt. Ajusta la redacción o especifica proyecto/etiqueta."
  },
};

const de = {
  heroTitle: "Willkommen bei AI Issue Share",
  heroSubtitle: "Schreibe einen Prompt, wähle Jira-Tickets und sende eine sichere, geschwärzte E-Mail-Zusammenfassung.",
  specRows: [
    {
      id: "solves", label: "Was gelöst wird:", links: [
        "Sicheres externes Teilen von Jira-Daten, weniger Copy-Paste, abgestimmte Stakeholder, Lieferanten-Zusammenarbeit und revisionssichere Nachverfolgung."
      ]
    },
    {
      id: "who", label: "Für wen:", links: [
        "PM/Programm, Product, Engineering/Architecture, QA/Support, Kunden, Lieferanten und Prüfer."
      ]
    },
    {
      id: "inside", label: "Was enthalten ist:", links: [
        "Prompts, Vorlagen, Schwärzungsregeln, Empfänger, Zugriffskontrollen, sichere Links, Anhänge, Audit-Logs."
      ]
    },
    {
      id: "ai", label: "KI in Aktion:", links: [
        "Auswahl per natürlicher Sprache, Auto-Schwärzung, smarte Zusammenfassungen, Rollenansichten und Prompt-zu-E-Mail."
      ]
    },
    {
      id: "build", label: "Schneller entwickeln & integrieren:", links: [
        "Jira-API-Scopes & Webhooks, Prompt-Muster, SMTP/SendGrid/O365, Service für sichere Links, Daten-Mapping."
      ]
    },
    {
      id: "measure", label: "Wirkung messen:", links: [
        "Zustellrate, Öffnungen/Klicks, Link-Aufrufe, Versende-Latenz, Response-SLA und Audit-Ereignisse."
      ]
    },
  ],
  ctas: {
    run: "AI Issue Share öffnen",
    rescan: "Tickets neu wählen",
    analyze: "E-Mail Vorschau",
    moreApps: "Weitere von uns",
    contactUs: "Kontakt aufnehmen",
  },
  moreApps: {
    title: "Weitere Apps von Uns",
    subtitle: "Entdecke zusätzliche Workflows und Utilities",
    drawerTitle: "Weitere Apps von Uns",
    featuredTitle: "Empfohlen",
    footer: "Mit ❤️ vom Team gebaut"
  },
  assistant: {
    title: "Willkommen beim Issue-Share-Assistenten",
    subtitle: "Tickets teilen, schwärzen, Zugriff steuern und Nachverfolgung — mit einem Prompt.",
    quickActions: [
      { id: "sprint_summary", label: "Sprint-Zusammenfassung teilen", icon: "activity" },
      { id: "vendor_blockers", label: "Blocker an Lieferant senden", icon: "alert-circle" },
      { id: "unassigned_mail", label: "Unzugewiesene Tickets mailen", icon: "users" },
      { id: "weekly_client", label: "Wöchentliches Kunden-Update", icon: "calendar" },
    ],
    inputPlaceholder: "Beschreibe, was geteilt werden soll (z. B. „Blocker an Acme senden“)",
  },
  chat: {
    suggestionsTitle: "Vorgeschlagene Folgefragen:",
    followUps: [
      "Sollen E-Mails, Telefonnummern und interne Links geschwärzt werden?",
      "Letzte Kommentare einbeziehen und zusätzlich eine CSV anhängen?"
    ],
    networkErrorTitle: "Netzwerkfehler: Jira oder E-Mail-Dienst nicht erreichbar.",
    networkErrorHint: "Bitte Jira-Verbindung und ausgehende E-Mail-Konfiguration prüfen.",
    needMoreHelp: "Mehr Hilfe benötigt?",
    contactUs: "Kontakt aufnehmen",
    waitingMessages: [
      "✉️ E-Mail-Text verfassen…",
      "🔐 Schwärzungsregeln anwenden…",
      "🧭 JQL und Filter auflösen…",
      "📌 Ausgewählte Tickets sammeln…",
      "🧾 Tabellen und Felder formatieren…",
      "🔗 Sicheren Link erstellen…",
      "📎 CSV/PDF anhängen…",
      "🕵️ Sensible Daten prüfen…",
      "🗂️ Nach Epic und Status gruppieren…",
      "🧠 Risiken und Blocker zusammenfassen…",
      "✅ Empfänger prüfen…",
      "📬 Versand über den konfigurierten Provider…"
    ]
  },
  labels: {
    lastScanned: "Zuletzt geteilt:",
    scanningProgress: "Packe Element {current} von {total}."
  },
  defaultRetry: {
    retryMessage: "Hm, ich konnte das nicht abschließen. Bitte versuche die Anfrage erneut."
  },
  ragRetry: {
    retryMessageRag: "Keine passenden Elemente zum Prompt gefunden. Bitte präzisiere Projekt/Label oder formuliere neu."
  },
};

// Helper: map locale → language pack (default to English)
export function getIssueShareContent(locale) {
  try {
    const raw = String(locale || "en").toLowerCase().replace(/[-_]/g, "_");
    const lang = raw.split("_")[0]; // "en_US" -> "en"

    if (lang === "fr") return fr;
    if (lang === "es") return es;
    if (lang === "de") return de;

    return en;
  } catch (error) {
    console.warn("Error resolving content for locale:", locale, error);
    return en; // Fallback to English
  }
}

// Back-compat for previous imports:
export function getBacklogContent(locale) {
  return getIssueShareContent(locale);
}

export const packs = { en, fr, es, de };
