/**
 * form-options.ts
 *
 * Single source of truth for every SelectOption dataset used across the
 * subscription forms. Keeping data here means no component needs to import
 * from a sibling component, and the review-section builder has a clean,
 * stable import target.
 *
 * Labels that start with a translation namespace key (e.g. 'options.student.*')
 * are resolved at render time via TranslateService / translate pipe.
 * Plain-text labels (e.g. distro names, state names) are displayed as-is.
 */

// ── Shared interface ──────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ── Shared across Participant & Collaborator ──────────────────────────────────

export const DISTROS: SelectOption[] = [
  { value: '1', label: 'Não uso Linux' },
  { value: '2', label: 'BigLinux' },
  { value: '3', label: 'Debian' },
  { value: '4', label: 'Duzeru' },
  { value: '5', label: 'Educatux' },
  { value: '6', label: 'Elementary OS' },
  { value: '7', label: 'Fedora' },
  { value: '8', label: 'Kaiana' },
  { value: '9', label: 'Kali Linux' },
  { value: '10', label: 'LinuxMint' },
  { value: '11', label: 'LXLE' },
  { value: '12', label: 'SlackWare' },
  { value: '13', label: 'Suse' },
  { value: '14', label: 'Tails' },
  { value: '15', label: 'Trisquel' },
  { value: '16', label: 'Ubuntu/Kubuntu' },
  { value: '17', label: 'Outro' },
];

export const STUDENT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'options.student.highSchool' },
  { value: '2', label: 'options.student.techHighSchool' },
  { value: '3', label: 'options.student.university' },
  { value: '4', label: 'options.student.graduated' },
  { value: '5', label: 'options.student.working' },
  { value: '6', label: 'options.student.neither' },
  { value: '7', label: 'options.student.teacher' },
  { value: '8', label: 'options.student.other' },
];

// ── Participant ───────────────────────────────────────────────────────────────

export const STATES_BR: SelectOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// ── Collaborator ──────────────────────────────────────────────────────────────

export const SHIFT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'formCollaborator.shifts.morningAll' },
  { value: '2', label: 'formCollaborator.shifts.afternoonAll' },
  { value: '3', label: 'formCollaborator.shifts.eveningAll' },
  { value: '4', label: 'formCollaborator.shifts.saturdayMorning' },
  { value: '5', label: 'formCollaborator.shifts.saturdayAfternoon' },
];

export const COLLABORATION_AREAS: SelectOption[] = [
  { value: '1', label: 'formCollaborator.areas.group1' },
  { value: '2', label: 'formCollaborator.areas.group2' },
  { value: '3', label: 'formCollaborator.areas.group3' },
  { value: '4', label: 'formCollaborator.areas.group4' },
  { value: '5', label: 'formCollaborator.areas.group5' },
  { value: '6', label: 'formCollaborator.areas.group6' },
  { value: '7', label: 'formCollaborator.areas.group7' },
  { value: '8', label: 'formCollaborator.areas.group8' },
  { value: '9', label: 'formCollaborator.areas.group9' },
  { value: '10', label: 'formCollaborator.areas.group10' },
  { value: '11', label: 'formCollaborator.areas.group11' },
  { value: '12', label: 'formCollaborator.areas.group12' },
  { value: '13', label: 'formCollaborator.areas.group13' },
];

// ── Speaker / Talk ────────────────────────────────────────────────────────────

export const TEMAS: SelectOption[] = [
  // { value: 'administracao-de-sistemas', label: 'formSpeaker.temas.administracaoDeSistemas' },
  // { value: 'banco-de-dados', label: 'formSpeaker.temas.bancoDeDados' },
  // { value: 'cultura-livre', label: 'formSpeaker.temas.culturaLivre' },
  // { value: 'desktop', label: 'formSpeaker.temas.desktop' },
  // { value: 'desenvolvimento-de-software', label: 'formSpeaker.temas.desenvolvimentoDeSoftware' },
  // { value: 'devops-sre', label: 'formSpeaker.temas.devopsSre' },
  // { value: 'educacao', label: 'formSpeaker.temas.educacao' },
  // { value: 'embarcados-iot', label: 'formSpeaker.temas.embarcadosIot' },
  // { value: 'infraestrutura', label: 'formSpeaker.temas.infraestrutura' },
  // { value: 'jogos', label: 'formSpeaker.temas.jogos' },
  // { value: 'kernel', label: 'formSpeaker.temas.kernel' },
  // { value: 'redes', label: 'formSpeaker.temas.redes' },
  // { value: 'seguranca', label: 'formSpeaker.temas.seguranca' },
  // { value: 'web', label: 'formSpeaker.temas.web' },
  // { value: 'outro', label: 'formSpeaker.temas.outro' },
  {
    value: '1',
    label: 'Acessibilidade Livre (Aplicativos para portadores de necessidades física)',
  },
  { value: '2', label: 'Criptotecnologias' },
  { value: '3', label: 'Desenvolvimento (Programação)' },
  { value: '4', label: 'Design de Imagens' },
  { value: '5', label: 'Ecossistema de Software Livre' },
  { value: '6', label: 'Educação' },
  { value: '7', label: 'Flisolzinho (Oficina voltada para crianças)' },
  { value: '8', label: 'Games' },
  { value: '9', label: 'Gestão de Projetos' },
  { value: '10', label: 'Governança de Dados' },
  { value: '11', label: 'Internet das Coisas' },
  { value: '12', label: 'Infraestrutura' },
  { value: '13', label: 'Robótica Livre' },
  { value: '14', label: 'Segurança e Privacidade' },
  { value: '15', label: 'Sistemas Operacionais' },
  { value: '16', label: 'Software Público' },
  { value: '17', label: 'Startups e Empreendedorismo' },
  { value: '18', label: 'TI Verde (Sustentabilidade)' },
  { value: '19', label: 'Web' },
];

export const TIPOS: SelectOption[] = [
  { value: 'T', label: 'formSpeaker.types.talk' },
  { value: 'O', label: 'formSpeaker.types.workshop' },
];

export const TURNOS: SelectOption[] = [
  { value: 'M', label: 'formSpeaker.shifts.morning' },
  { value: 'A', label: 'formSpeaker.shifts.afternoon' },
  { value: 'W', label: 'formSpeaker.shifts.noPreference' },
];
