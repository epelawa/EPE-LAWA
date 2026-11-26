export const MOBILE_GROUPS = [
  { label: "Read", routes: [["/news", "News"], ["/radio", "Radio"]] },
  { label: "Community", routes: [["/events", "Events"], ["/itan-ilu-mi", "Ìtàn Ilú Mi"], ["/forum", "Forum"], ["/who-is-who", "Who is Who"]] },
  { label: "Explore", routes: [["/map", "Map & Navigation"], ["/business-directory", "Business Directory"], ["/tourism", "Tourism"], ["/gallery", "Gallery"]] },
  { label: "EPE LAWA", routes: [["/about", "About"], ["/contact", "Contact"], ["/guidelines", "Guidelines"], ["/advertise", "Advertise"], ["/newsletter", "Newsletter"], ["/support", "Support"], ["/photo-credits", "Photo credits"], ["/privacy", "Privacy"], ["/terms", "Terms"]] },
] as const;

export const MOBILE_EXTRA_LINKS = [["/news?search=1", "Search news"], ["/auth", "Create account"], ["/login", "Sign in"]] as const;
