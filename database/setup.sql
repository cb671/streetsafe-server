DROP TABLE IF EXISTS educational_sources;
DROP TABLE IF EXISTS emergency_services;
DROP TABLE IF EXISTS users;

CREATE EXTENSION IF NOT EXISTS h3 CASCADE;
CREATE EXTENSION IF NOT EXISTS h3_postgis CASCADE;

CREATE TABLE users (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    h3 BIGINT NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE emergency_services (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    h3 BIGINT NOT NULL
);

CREATE TABLE educational_sources (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_crime_type VARCHAR(50) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO educational_sources (title, url, description, type, target_crime_type)
VALUES
('Safest Home Practices – Police.uk',
'https://www.police.uk/cp/crime-prevention/',
'Safest Home Practices is a Police.uk guide that helps you keep your home, family, and belongings secure. It offers practical tips on preventing burglary, securing doors and windows, and using smart security. With clear advice from law enforcement, it’s a trusted resource to make your home safer and give you peace of mind.',
'guide',
'burglary, vehicle_crime'),

('Keep Burglars Out – Police.uk',
'https://www.police.uk/cp/crime-prevention/protect-home-crime/keep-burglars-out-property/',
'This official Police.uk prevention guide focuses on keeping burglars out of residential property. It provides actionable steps such as reinforcing doors, installing motion sensors, and improving outdoor lighting to deter break-ins. Designed for homeowners and tenants, it empowers residents to take practical measures to secure their property.',
'guide',
'burglary'),

('Business Burglary Prevention – Police.uk',
'https://www.police.uk/cp/crime-prevention/keeping-business-safe-from-crime/keep-burglars-out-business/',
'A comprehensive Police.uk guide aimed at small business owners and shopkeepers. It explains how to secure commercial properties against burglary, including shutter systems, CCTV placement, and alarm strategies. The guide offers practical prevention tips tailored to businesses vulnerable to theft and break-ins.',
'guide',
'burglary, shoplifting'),

('Knife Crime Awareness – Ben Kinsella Trust',
'https://benkinsella.org.uk/',
'The Ben Kinsella Trust is one of the UK’s leading knife crime prevention charities. It provides impactful educational resources, exhibitions, and workshops designed to raise awareness about the devastating consequences of knife crime. Their interactive approach helps young people understand the dangers and long-term impacts of carrying weapons.',
'prevention',
'weapon_crime, violent'),

('Youth Violence Toolkit – Youth Endowment Fund',
'https://youthendowmentfund.org.uk/yef-toolkit-what-works-to-prevent-youth-violence/',
'The Youth Endowment Fund Toolkit is an evidence-based resource that compiles what works in preventing youth violence. It covers mentoring, family support, and school interventions with clear impact ratings. Policymakers, educators, and communities can use this prevention tool to make informed decisions about tackling violent and weapon-related crime.',
'prevention',
'violent, weapon_crime'),

('Fearless – Anonymous Crime Reporting',
'https://crimestoppers-uk.org/fearless',
'Fearless, part of Crimestoppers, provides a safe and anonymous platform for young people to report crime without fear of retaliation. It educates youth about the dangers of crime while offering a helpline and online portal to share information with authorities confidentially. This resource is key in empowering communities to break the silence on violence and knife crime.',
'helpline',
'weapon_crime, violent'),

('Victim Support UK',
'https://www.victimsupport.org.uk/',
'Victim Support is a free and confidential service available across the UK. It provides emotional support, practical help, and advocacy for victims of all types of crime. Trained staff and volunteers help individuals recover, rebuild confidence, and navigate the criminal justice system. Available 24/7, it is one of the most vital support systems for victims of violent and robbery-related crimes.',
'support',
'violent, robbery'),

('Stand Against Violence',
'https://en.wikipedia.org/wiki/Stand_Against_Violence',
'Stand Against Violence delivers workshops and education programs across the UK aimed at reducing youth violence. Through engaging sessions, they teach conflict resolution, empathy, and decision-making skills. Their prevention approach empowers young people to avoid violent situations and builds safer communities.',
'prevention',
'violent, weapon_crime'),

('Kidscape – Child Safety and Anti-Bullying',
'https://en.wikipedia.org/wiki/Kidscape',
'Kidscape is a leading UK charity dedicated to preventing bullying and safeguarding children. Their resources include training, workshops, and advice for parents and educators. By focusing on confidence-building and awareness, Kidscape helps reduce anti-social behaviour and supports young people in standing up to harassment.',
'prevention',
'anti_social'),

('Chance UK – Mentoring Programme',
'https://en.wikipedia.org/wiki/Chance_UK',
'Chance UK provides early-intervention mentoring for children at risk of developing anti-social or violent behaviour. Their evidence-based approach supports families, schools, and local authorities in tackling root causes of youth crime. By building resilience and life skills, they help prevent anti-social patterns from escalating into crime.',
'counseling',
'anti_social, violent'),

('Safer Living Foundation',
'https://en.wikipedia.org/wiki/Safer_Living_Foundation',
'The Safer Living Foundation is a UK charity focused on reducing sexual offending and reoffending. It offers therapy, prevention programmes, and counselling for individuals at risk, as well as support for victims. Its holistic approach reduces harm in communities and helps create long-term rehabilitation opportunities.',
'counseling',
'sexual_offences'),

('Act Against Bullying',
'https://en.wikipedia.org/wiki/Act_Against_Bullying',
'Act Against Bullying is a UK charity offering advice, campaigns, and peer support to reduce bullying in schools and online spaces. It provides information guides for children and parents to manage and report bullying effectively. As a prevention tool, it reduces anti-social behaviour and builds safer learning environments.',
'advice',
'anti_social'),

('West Yorkshire Police – Home Security Advice',
'https://www.westyorkshire.police.uk/ask-the-police/question/Q1098',
'West Yorkshire Police provide detailed crime prevention advice on securing homes. Their recommendations cover locks, alarms, outdoor lighting, and environmental design to reduce burglary opportunities. With practical steps from law enforcement, this guide empowers residents to take control of their home security.',
'guide',
'burglary'),

('Residential Burglary Facts – Police.uk',
'https://www.police.uk/cp/crime-prevention/protect-home-crime/residential-burglary-facts/',
'This Police.uk page highlights key facts and statistics about burglary and prevention. It explains common burglary methods and how to guard against them with simple changes. Residents gain a better understanding of burglary risks and the most effective prevention strategies.',
'advice',
'burglary'),

('Conflict De-escalation – Cleveland PCC',
'https://www.cleveland.pcc.police.uk/curv/resources/knife-crime/',
'This Cleveland Police and Crime Commissioner resource provides knife crime prevention materials with a focus on conflict de-escalation. It teaches young people how to avoid and resolve confrontations without violence. The guide equips schools and communities with practical prevention strategies.',
'prevention',
'weapon_crime, violent'),

('Shrubbery Deterrent Tips – Met Police',
'https://www.thetimes.co.uk/article/met-police-advise-planting-shrubs-to-deter-burglars-kk8jg2s2j',
'An unusual but practical prevention tip from the Met Police encourages residents to use defensive gardening to reduce burglary. Planting thorny shrubs and hedges around fences and windows makes break-ins harder. This environmental design approach is part of crime prevention through design.',
'prevention',
'burglary'),

('Crimestoppers UK',
'https://www.crimestoppers-uk.org/',
'Crimestoppers is a national independent charity that allows people to report crimes anonymously. It provides a helpline and online platform where citizens can share information without fear of being identified. By encouraging community reporting, it plays a vital role in tackling all types of crime in the UK.',
'helpline',
'all'),

('Legal Advice Centre – Citizens Advice',
'https://www.citizensadvice.org.uk/law-and-courts/legal-system/',
'Citizens Advice offers free, confidential, and impartial legal advice on a wide range of issues, including crime, victim rights, and the justice system. This resource is invaluable for individuals needing guidance on legal options after experiencing theft, burglary, or violent crime.',
'legal',
'all'),

('Drug Awareness for Teenagers – Talk to Frank',
'https://www.talktofrank.com/',
'Talk to Frank is a UK-wide service providing honest information about drugs. It educates young people about the risks of drug use, dealing, and associated criminal behaviour. With a confidential helpline and online chat, it empowers individuals to make informed choices and seek help when needed.',
'advice',
'drugs'),

('Neighbourhood Watch – Community Safety',
'https://www.ourwatch.org.uk/',
'Neighbourhood Watch is one of the UK’s longest-standing crime prevention schemes. It empowers communities to come together, share information, and protect each other from burglary, theft, and anti-social behaviour. Through advice, online resources, and active local networks, it builds resilience and fosters safer neighbourhoods.',
'prevention',
'burglary, personal_theft, anti_social'),

('National Vehicle Crime Prevention Advice – Police.uk',
'https://www.police.uk/cp/crime-prevention/vehicle-crime-prevention/',
'Police.uk provides comprehensive vehicle crime prevention advice, including tips on parking safely, using immobilisers, and protecting valuables. It helps drivers reduce their risk of car theft, catalytic converter theft, and vehicle break-ins. With clear guidance, it gives vehicle owners peace of mind.',
'guide',
'vehicle_crime'),

('Bicycle Theft Prevention – BikeRegister',
'https://www.bikeregister.com/',
'BikeRegister is the UK’s national bicycle marking and registration scheme supported by police. Cyclists can register their bikes to deter theft and increase recovery chances. With advice on locks and secure storage, BikeRegister provides practical solutions to reduce bicycle theft.',
'prevention',
'bicycle_theft'),

('Shoplifting Prevention Toolkit – British Retail Consortium',
'https://brc.org.uk/',
'The British Retail Consortium provides retailers with guidance on preventing shoplifting. It covers staff training, store design, CCTV use, and how to engage with local police. Retailers gain practical prevention strategies to reduce loss, improve safety, and support frontline staff.',
'guide',
'shoplifting'),

('Robbery Prevention Advice – Metropolitan Police',
'https://www.met.police.uk/cp/crime-prevention/personal-robbery/',
'The Met Police offer clear prevention advice on avoiding personal robbery. It includes tips on staying aware in public, securing valuables, and what to do if confronted. These practical steps are designed to reduce robbery risks for pedestrians and commuters.',
'advice',
'robbery'),

('Anti-Social Behaviour Support – ASB Help',
'https://asbhelp.co.uk/',
'ASB Help is a national charity providing advice and support for victims of anti-social behaviour. It explains rights, reporting processes, and where to get help. With resources for communities and individuals, it is an essential support system for tackling persistent anti-social issues.',
'support',
'anti_social'),

('Drug Support and Counseling – Release UK',
'https://www.release.org.uk/',
'Release is the UK’s centre of expertise on drugs and drugs law. It provides free and confidential legal advice, counselling, and harm reduction services. This resource helps individuals struggling with drugs understand their rights, reduce harm, and access support networks.',
'counseling',
'drugs'),

('Damage and Vandalism Prevention – Keep Britain Tidy',
'https://www.keepbritaintidy.org/',
'Keep Britain Tidy runs campaigns that raise awareness about vandalism, graffiti, and damage to public spaces. By educating communities and young people, it encourages respect for the environment and reduces anti-social damage. The charity empowers citizens to report and prevent vandalism in their area.',
'prevention',
'damage, anti_social'),

('Stop Knife Crime – Metropolitan Police',
'https://www.met.police.uk/cp/crime-prevention/stop-knife-crime/',
'The Met Police provide dedicated resources for knife crime awareness and prevention. It includes advice for parents, teachers, and young people on how to spot risks, access help, and report concerns. The guide aims to reduce weapon-related crime and protect vulnerable individuals.',
'guide',
'weapon_crime'),

('Personal Theft Prevention – Police.uk',
'https://www.police.uk/cp/crime-prevention/personal-theft/',
'Police.uk offers clear prevention advice for avoiding pickpocketing and bag theft. It explains how to protect belongings in crowded areas, use secure bags, and stay alert. This resource reduces risks for commuters, tourists, and shoppers in busy environments.',
'advice',
'personal_theft'),

('Drugs Education – Mentor UK',
'https://mentoruk.org.uk/',
'Mentor UK is a prevention-focused charity delivering drug and alcohol education. It provides resources for schools, parents, and youth organisations to reduce substance misuse. With evidence-based programmes, Mentor UK equips young people to make safer choices and avoid drug-related crime.',
'prevention',
'drugs'),

('Legal Rights for Victims – Victim Support',
'https://www.victimsupport.org.uk/help-and-support/your-rights/',
'Victim Support explains the legal rights of crime victims in the UK. This guide helps individuals understand compensation, victim statements, and court processes. It empowers victims of burglary, violent crime, and robbery to seek justice and rebuild their lives.',
'legal',
'violent, robbery, burglary'),

('24/7 Domestic Abuse Helpline – Refuge',
'https://refuge.org.uk/',
'Refuge operates a national helpline and support service for victims of domestic abuse. It provides confidential advice, shelter, and counselling for those experiencing violence in the home. This resource saves lives by connecting victims to immediate support and long-term safety.',
'helpline',
'violent'),

('Neighbourhood Crime Reduction Interventions – College of Policing',
'https://www.college.police.uk/',
'The College of Policing offers evidence-based interventions for neighbourhood crimes such as burglary and robbery. This resource explains proven strategies like increased street lighting, hotspot policing, and property marking. It is designed for law enforcement and community groups to implement effective prevention.',
'prevention',
'burglary, robbery'),

('Vehicle Crime – Secured by Design',
'https://www.securedbydesign.com/',
'Secured by Design provides vehicle manufacturers and drivers with security standards and guidance. It promotes design principles that reduce car theft, catalytic converter theft, and vandalism. This official initiative links law enforcement with industry to reduce vehicle crime nationwide.',
'guide',
'vehicle_crime'),

('Personal Safety Advice – Suzy Lamplugh Trust',
'https://www.suzylamplugh.org/',
'The Suzy Lamplugh Trust is dedicated to reducing violence and aggression by promoting personal safety. It offers resources for lone workers, travellers, and the general public on how to stay safe and avoid personal theft or violent incidents. Its advice is trusted by organisations and individuals alike.',
'advice',
'personal_theft, violent'),

('Home Security – Secured by Design',
'https://www.securedbydesign.com/guidance',
'Secured by Design publishes detailed guides on designing out crime in homes. It provides guidance on secure doors, windows, and layouts that reduce burglary risk. By embedding crime prevention into design, it creates long-lasting protection for homeowners.',
'guide',
'burglary'),

('Anti-Social Behaviour Legal Guidance – GOV.UK',
'https://www.gov.uk/asb-crime-and-police',
'GOV.UK provides official legal guidance on anti-social behaviour powers. It explains ASBOs, injunctions, and community protection notices, making the legal system more accessible to victims. This resource ensures communities understand how the law can help tackle persistent anti-social behaviour.',
'legal',
'anti_social'),

('Stop Drugs Campaign – NHS',
'https://www.nhs.uk/live-well/healthy-body/drug-addiction-getting-help/',
'The NHS runs national campaigns to help people access drug addiction services. It provides advice on recognising dependence, seeking medical help, and treatment options. With a focus on prevention and recovery, it reduces harm from drugs across the UK.',
'support',
'drugs');
