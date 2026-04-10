export function getMahina(): { name: string; day: number } {
  // TODO: implement real lunar calculation
  return { name: "Akua", day: 14 };
}

export function getKau(): string {
  // TODO: implement real season logic
  // Ho'oilo (wet) ~Oct-Feb, Kau (dry) ~Mar-Sep
  const month = new Date().getMonth();
  return month >= 2 && month <= 8 ? "Kau" : "Hoʻoilo";
}
