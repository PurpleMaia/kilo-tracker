export function getAloha(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 12) return `Aloha kakahiaka e ${name}`;
  if (hour >= 12 && hour < 17) return `Aloha awakea e ${name}`;
  return `Aloha ahiahi e ${name}`;
}
