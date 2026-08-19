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
  if (/diagnos|what injury|torn|fracture|dislocat|prescri|dose|medicine|medication/.test(text)) {
    return "I can explain possibilities, warning signs and sensible next steps, but I cannot diagnose an injury, interpret an examination I have not performed, or prescribe medicines. Pause the aggravating activity. Seek an appropriate clinician promptly for deformity, inability to bear weight, major swelling, loss of function, worsening pain, fever, neurological symptoms or symptoms that persist despite rest.";
  }
  return "HEALTH & INJURY GUIDANCE\n\nTell me what happened, where the symptom is, when it began, its severity, what makes it better or worse, and whether there is swelling, deformity, weakness, numbness, fever, breathlessness or reduced function. I can provide educational possibilities, identify warning signs, suggest conservative training modifications and help you decide what level of professional assessment is sensible. I cannot confirm a diagnosis or prescribe rehabilitation or medication.";
}
