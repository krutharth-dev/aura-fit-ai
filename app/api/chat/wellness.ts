const URGENT_PATTERN = /chest pain|faint(?:ed|ing)?|severe.*(?:breath|allerg)|new.*(?:numb|weak|confus)|major.*injur|uncontrolled bleeding|suicid|overdose/i;

export function isUrgentHealthQuestion(message: string) {
  return URGENT_PATTERN.test(message);
}

export function nutritionAnswer(message: string) {
  const text = message.toLowerCase();
  if (/eating disorder|purge|vomit|starv|underweight|rapid weight loss/.test(text)) {
    return "I can help with general sports nutrition, but restrictive eating, purging, rapid weight loss or concern about an eating disorder needs individual support from a doctor and an appropriately qualified dietitian. Avoid aggressive calorie targets. If you feel medically unwell or unsafe, seek urgent local help.";
  }
  if (/pregnan|kidney|renal|liver|diabet|insulin|warfarin|medication|allerg/.test(text)) {
    return "Nutrition can interact with medical conditions and medicines, so I should not prescribe a personalised medical diet from chat alone. I can explain general principles, help you prepare questions, or adapt a plan after your doctor or accredited dietitian has given the relevant targets and restrictions.";
  }
  if (/protein/.test(text)) {
    return "SPORTS NUTRITION — PROTEIN\n\nFor a healthy adult who resistance trains, a practical general range is about 1.6–2.2 g of protein per kg of body weight per day. Spread it across 3–5 meals, choose foods you tolerate and can afford, and use supplements only for convenience. A medical condition, pregnancy or prescribed diet can change what is appropriate.\n\nEVIDENCE — ISSN protein position stand: https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8";
  }
  if (/creatine/.test(text)) {
    return "SUPPLEMENT GUIDE — CREATINE\n\nCreatine monohydrate is the best-studied form for strength and repeated high-intensity training. A common general approach for healthy adults is 3–5 g daily; loading is optional. Choose a reputable third-party-tested product. Check with a clinician first if you are pregnant, under 18, have kidney disease, take relevant medicines or have been told to restrict supplements.\n\nEVIDENCE — Australian Institute of Sport supplement framework: https://www.ais.gov.au/nutrition/supplements/group_a";
  }
  return "SPORTS NUTRITION FRAMEWORK\n\n1. Set the goal: performance, muscle gain, fat loss or weight maintenance.\n2. Build meals around minimally processed carbohydrate, a protein source, vegetables or fruit, and dietary fat.\n3. Place an easy-to-digest carbohydrate and protein meal around demanding training when useful.\n4. Adjust portions gradually using body-weight trend, gym performance, hunger, energy and recovery—not a single weigh-in.\n5. Hydrate regularly; unusually heavy sweating, heat or long-duration exercise may require electrolytes.\n\nTell me your goal, age range, body weight, dietary pattern, training schedule, food allergies and any clinician-directed restrictions, and I can suggest an educational meal structure. I do not replace an accredited dietitian or prescribe a medical diet.";
}

export function healthAnswer(message: string) {
  const text = message.toLowerCase();
  if (isUrgentHealthQuestion(message)) {
    return "Stop training and contact your local emergency service now. Chest pain, fainting, severe breathing difficulty, a severe allergic reaction, new weakness or numbness, uncontrolled bleeding, overdose concerns or a major acute injury should not be managed through an AI coach. Do not drive yourself if you may be seriously unwell.";
  }

  if (/shoulder/.test(text)) {
    return "GYM SHOULDER PAIN — COMMON POSSIBILITIES\n\nShoulder pain after pressing, lateral raises or dips can come from simple load irritation, rotator-cuff or biceps-tendon irritation, or the shoulder joint itself. The exact cause cannot be confirmed from chat alone.\n\nTODAY — Stop the movement that reproduces sharp pain. Try reducing load and range, keeping the elbow slightly forward on pressing, or swapping to a neutral-grip dumbbell/machine variation if that is comfortable. You can usually keep training pain-free lower body and unaffected movements.\n\nGET ASSESSED SOONER if there was a traumatic pop, visible deformity, major weakness, inability to raise the arm, marked swelling, numbness, fever, or rapidly worsening pain. If it is mild but keeps recurring for more than a couple of weeks, an in-person assessment is sensible.\n\nTell me exactly where the shoulder hurts, which exercise triggers it, whether it hurts at rest, and whether strength or range of motion changed.";
  }

  if (/elbow|forearm|wrist/.test(text)) {
    return "ELBOW / FOREARM / WRIST PAIN FROM TRAINING\n\nCommon gym-related causes include temporary overload of the wrist-flexor or extensor tendons, grip-volume irritation, or a specific exercise position that your joint does not tolerate well. I cannot confirm the diagnosis from text alone.\n\nTRY — Reduce or pause the provoking movement for several sessions, avoid repeated painful failure sets, use a neutral grip where possible, and keep training variations that stay comfortable. For curls/extensions, lighter loads and slower controlled reps are often easier to tolerate than forcing the same heavy movement.\n\nSEEK ASSESSMENT if there is significant swelling, deformity, loss of grip strength, persistent numbness/tingling, a traumatic injury, severe night/rest pain, or symptoms that keep worsening despite load reduction.\n\nTell me whether the pain is on the inner elbow, outer elbow, wrist, or forearm and which lift sets it off.";
  }

  if (/knee/.test(text)) {
    return "GYM KNEE PAIN — HOW TO THINK ABOUT IT\n\nKnee pain during squats, lunges or leg extensions can reflect simple load sensitivity, patellofemoral irritation, tendon irritation, or less commonly an acute structural injury. Location, swelling, locking/giving-way and how it started matter a lot.\n\nTRY — Reduce the painful load or depth temporarily, keep the knee tracking comfortably over the foot, and use a pain-free alternative such as a shorter-range squat, split squat, hip-dominant work or another machine variation. Do not force reps through sharp pain.\n\nGET ASSESSED if the knee is very swollen, locked, repeatedly gives way, cannot bear weight, was injured with a twist/pop, looks deformed, or symptoms progressively worsen.\n\nTell me where the pain is—front, inside, outside or back of the knee—and which exercise triggers it.";
  }

  if (/back|spine|lower back|low back/.test(text)) {
    return "BACK PAIN AFTER TRAINING\n\nA sore or painful back after squats, deadlifts or rows is often related to muscle or load irritation, but text alone cannot determine the structure involved.\n\nTODAY — Avoid the movement that causes sharp or escalating pain, keep gently moving if comfortable, and train unaffected areas using positions that do not aggravate it. When returning, reduce load and volume and rebuild only while symptoms stay stable.\n\nURGENT ASSESSMENT is warranted for new leg weakness/numbness, loss of bladder or bowel control, numbness around the groin/saddle area, major trauma, fever with severe back pain, or rapidly worsening symptoms.\n\nTell me whether it is central or one-sided, whether pain travels into the leg, what lift triggered it and whether bending, sitting or walking changes it.";
  }

  if (/diagnos|what injury|torn|fracture|dislocat|prescri|dose|medicine|medication/.test(text)) {
    return "I can help narrow the possibilities and talk through warning signs, training modifications and next steps, but I cannot confirm a diagnosis or prescribe medication from chat. Tell me what happened, the exact location, severity, swelling/bruising, loss of function, and what movements reproduce it. Deformity, inability to bear weight, major swelling, progressive weakness/numbness, fever or rapidly worsening pain deserve prompt in-person assessment.";
  }

  return "GYM INJURY CHECK\n\nI can help you reason through this. Tell me: 1) where the pain is, 2) what exercise or event started it, 3) whether it was sudden or gradual, 4) pain from 0–10, 5) any swelling, bruising, weakness, numbness, clicking/locking or loss of motion, and 6) what movements make it better or worse.\n\nFrom that I can explain common possibilities, suggest what to modify in your training today, and flag anything that needs assessment. I cannot confirm a diagnosis from chat.";
}
