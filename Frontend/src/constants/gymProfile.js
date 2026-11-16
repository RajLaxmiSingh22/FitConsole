// Gym details shown on the public About, Contact, Privacy and Terms pages.
// Phone, email, address, WhatsApp and the map link are edited by the owner (Website → Contact details) and
// stored in the database. The values below are placeholders shown only until the owner saves them.
// The story, values, facilities and milestones are sample text to replace with the gym's own.
export const gymProfile = {
  name: "FitConsole",
  tagline: "Train hard. Eat smart. Grow faster.",
  foundedYear: 2021,
  address: {
    line1: "2nd Floor, Sample Plaza, 12 Demo Road",
    area: "Koramangala",
    city: "Bengaluru",
    postcode: "560034",
    landmark: "Above the sample café, opposite the metro exit",
  },
  phone: "+91 00000 00000",
  whatsapp: "+91 00000 00000",
  email: "hello@fitconsole.example.com",
  parking: "Two-wheeler parking at the entrance; paid car parking in the building basement.",
  story: [
    "FitConsole started in 2021 as a small boxing corner with one heavy bag and a handful of early-morning regulars. Members kept asking for more structure, so we added strength training, conditioning classes and a proper mixed martial arts program.",
    "Today the gym runs coached classes from 6 AM to late evening, seven days a week. Every member gets a training plan, a meal plan and a coach who knows their goals.",
  ],
  values: [
    ["Technique first", "Good form before heavy weights or hard sparring. Coaches correct every rep."],
    ["Progress you can see", "Weekly check-ins, weight and stamina tracking, and plans that adapt as you improve."],
    ["Everyone belongs", "Beginner, kids and women-only classes alongside advanced training."],
    ["Safety always", "Warm-ups, protective gear and supervised sparring in every combat class."],
  ],
  facilities: [
    ["Combat zone", "Mat area with heavy bags, speed bags and a sparring space."],
    ["Strength floor", "Power racks, barbells, dumbbells and kettlebells."],
    ["Conditioning area", "Rowers, assault bikes, sleds and functional training kit."],
    ["Changing rooms", "Separate changing rooms with lockers and showers."],
    ["Recovery corner", "Foam rollers, mobility tools and stretching space."],
    ["Filtered water", "Free drinking water station on the floor."],
  ],
  milestones: [
    ["2021", "Opened as a boxing corner"],
    ["2022", "Added strength & conditioning"],
    ["2023", "Launched MMA Fundamentals"],
    ["2024", "Kids and women-only classes"],
    ["2026", "FitConsole member app"],
  ],
  // Gallery tiles until real photos are added; no third-party images are used.
  gallery: [
    ["Combat zone", "Bag work and pad drills", "red"],
    ["Strength floor", "Racks and free weights", "green"],
    ["Morning conditioning", "6 AM group class", "yellow"],
    ["Kids class", "Saturday mornings", "pink"],
    ["Sparring night", "Advanced MMA, supervised", "red"],
    ["Recovery corner", "Mobility and stretching", "green"],
  ],
};

export function formattedAddress(address = gymProfile.address) {
  return [address.line1, address.area, `${address.city} ${address.postcode}`].filter(Boolean).join(", ");
}
