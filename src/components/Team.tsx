import Image from "next/image";

const team = [
  {
    initials: "CC",
    name: "Dr. Charles Chacko Porathoor",
    role: "Founder",
    description:
      "An emergency doctor who saw how much time hospitals lose every day, and set out to fix it. Leads the business and the clinical thinking.",
    credentials: null,
    photo: "/team/charles-chacko-porathoor.png",
  },
  {
    initials: "AA",
    name: "Dr. Aby Alex",
    role: "Co-founder, Clinical & AI",
    description:
      "A doctor studying how AI can help hospitals run better. Works on the clinical thinking, and leads the AI at DOQTO.",
    credentials: null,
    photo: "/team/aby-alex.jpg",
  },
  {
    initials: "AS",
    name: "Aamir Saudagar",
    role: "Co-founder, Product & Engineering",
    description:
      "A product builder who turns ideas into working software. Builds the technology that DOQTO runs on.",
    credentials: null,
    photo: "/team/aamir-saudagar.png",
  },
];

export function Team() {
  return (
    <section id="team" className="bg-peach py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-4 text-center text-sm font-semibold tracking-widest text-red uppercase">
          Two doctors and a builder
        </p>
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
          The team behind DOQTO
        </h2>

        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {team.map((member) => (
            <div
              key={member.name}
              className="card-hover flex flex-col items-center rounded-2xl border border-red/10 bg-white p-10 text-center"
            >
              {member.photo ? (
                <div className="mb-8 h-36 w-36 overflow-hidden rounded-full border-2 border-red/20">
                  <Image
                    src={member.photo}
                    alt={member.name}
                    width={144}
                    height={144}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              ) : (
                <div className="mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-red text-3xl font-semibold text-white">
                  {member.initials}
                </div>
              )}
              <h3 className="font-display text-xl font-semibold text-text">
                {member.name}
              </h3>
              <p className="mt-2 text-base font-medium text-red">{member.role}</p>
              <p className="mt-5 flex-1 text-base leading-relaxed text-text-muted">
                {member.description}
              </p>
              {member.credentials && (
                <p className="mt-5 text-sm font-medium tracking-wide text-text-muted">
                  {member.credentials}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
