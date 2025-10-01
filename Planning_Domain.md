Here's how to make this a universal planning framework that works for ANY domain:
🏗️ Universal Planning Pattern (Domain-Agnostic)
Core Abstraction
The key is to separate the planning process (always the same) from the domain knowledge (varies by context).
python# Universal Planning Framework
class UniversalPlanner:
    def __init__(self):
        self.domains = DomainRegistry()  # Pluggable domain configs
    
    def plan(self, user_input: str, plan_type: str):
        # Phase 1: Context Recognition
        context = self.detect_domain(user_input)
        
        # Phase 2: Question Generation (domain-specific)
        questions = self.domains.get_questions(context, plan_type)
        
        # Phase 3: Gap Analysis
        gaps = self.analyze_gaps(user_input, questions)
        
        # Phase 4: Information Enrichment (domain-specific)
        enriched_data = self.enrich(context, gaps)
        
        # Phase 5: Plan Synthesis
        plan = self.generate_plan(context, gaps, enriched_data)
        
        return plan
Domain Configuration Schema
Each planning domain uses the same structure:
json{
  "domain": "hiking_trip",
  "aliases": ["hiking", "backpacking", "trail", "mountain trek"],
  "description": "Planning hiking and backpacking trips",
  
  "questions": {
    "quick_plan": [
      {
        "id": "destination",
        "question": "Which trail or mountain are you planning to hike?",
        "why_matters": "Trail difficulty and permits vary dramatically",
        "type": "text",
        "required": true,
        "follow_ups": {
          "if_multi_day": ["camping_gear", "experience_level"]
        }
      },
      {
        "id": "dates",
        "question": "When are you planning to go?",
        "why_matters": "Weather, trail conditions, and permit availability are seasonal",
        "type": "date_range",
        "required": true
      },
      {
        "id": "experience_level",
        "question": "What's your hiking experience level?",
        "why_matters": "Determines appropriate trail difficulty and safety prep",
        "type": "choice",
        "options": ["beginner", "intermediate", "advanced"],
        "required": true
      },
      {
        "id": "group_size",
        "question": "Are you going solo or with others?",
        "why_matters": "Affects gear needs, safety planning, and permit requirements",
        "type": "text",
        "required": true
      },
      {
        "id": "duration",
        "question": "How many days is this hike?",
        "why_matters": "Determines gear, food, and logistics complexity",
        "type": "number",
        "required": true
      }
    ],
    
    "smart_plan": [
      "...above 5 questions...",
      {
        "id": "fitness_level",
        "question": "How would you rate your current fitness level?",
        "why_matters": "Helps determine realistic daily mileage targets",
        "type": "choice",
        "options": ["low", "moderate", "high"]
      },
      {
        "id": "concerns",
        "question": "Any specific concerns? (altitude, wildlife, water sources, etc.)",
        "why_matters": "Allows addressing safety and preparation gaps",
        "type": "text",
        "required": false
      }
    ]
  },
  
  "enrichment_rules": [
    {
      "condition": "has_destination && has_dates",
      "searches": [
        "weather forecast {destination} {month}",
        "trail conditions {destination} current",
        "permits required {destination}"
      ]
    },
    {
      "condition": "experience_level == 'beginner'",
      "searches": [
        "beginner hiking mistakes {destination}",
        "essential gear for beginners"
      ]
    }
  ],
  
  "plan_template": {
    "sections": [
      "Pre-Trip Preparation",
      "Gear Checklist",
      "Daily Itinerary",
      "Safety & Emergency Info",
      "Packing List",
      "Post-Trip"
    ],
    "must_include": [
      "weather_forecast",
      "emergency_contacts",
      "leave_no_trace_principles"
    ]
  },
  
  "safety_checks": [
    "warn_if_solo_beginner",
    "require_emergency_contact",
    "check_permit_requirements"
  ]
}

📚 Adding New Domains
To add a new planning domain (health/fitness, home renovation, wedding, etc.), just create a new config:
json{
  "domain": "fitness_program",
  "aliases": ["workout", "fitness", "gym", "exercise", "training"],
  
  "questions": {
    "quick_plan": [
      {
        "id": "goal",
        "question": "What's your primary fitness goal?",
        "why_matters": "Determines whether we focus on strength, cardio, or flexibility",
        "type": "choice",
        "options": ["weight_loss", "muscle_gain", "endurance", "general_health"],
        "required": true
      },
      {
        "id": "current_level",
        "question": "Current activity level?",
        "why_matters": "Prevents injury by starting at appropriate intensity",
        "type": "choice",
        "options": ["sedentary", "lightly_active", "moderately_active", "very_active"],
        "required": true
      },
      {
        "id": "time_commitment",
        "question": "How many days per week can you commit?",
        "why_matters": "Creates realistic schedule you'll actually stick to",
        "type": "number",
        "min": 2,
        "max": 7,
        "required": true
      },
      {
        "id": "location",
        "question": "Where will you work out?",
        "why_matters": "Determines if we need home, gym, or outdoor exercises",
        "type": "choice",
        "options": ["home_no_equipment", "home_basic_equipment", "gym", "outdoors"],
        "required": true
      },
      {
        "id": "timeline",
        "question": "What's your target timeline?",
        "why_matters": "Sets realistic expectations and milestones",
        "type": "text",
        "required": true
      }
    ]
  },
  
  "enrichment_rules": [
    {
      "condition": "current_level == 'sedentary'",
      "searches": [
        "safe exercise progression for beginners",
        "common beginner fitness mistakes"
      ]
    }
  ],
  
  "safety_checks": [
    "recommend_doctor_checkup_if_sedentary",
    "warn_about_realistic_timelines",
    "check_for_disordered_patterns"
  ]
}

🧠 The Universal System Prompt
markdown# Universal Planning Agent

You are a versatile planning assistant that helps users create actionable plans 
for ANY domain. You follow the same 5-phase process regardless of topic.

## Phase 1: Domain Detection
Classify user's planning need into a domain. Supported domains are loaded 
dynamically from the domain registry. If no exact match, find closest domain 
or use "general_planning" fallback.

## Phase 2: Question Generation
Load domain-specific questions from config. Present ONLY unanswered questions 
based on what user already provided. Always explain why each question matters.

## Phase 3: Gap Analysis
Parse user input to identify what information they've already provided.
Extract implicit information (e.g., "next week" → specific dates).
Identify what's still missing from required questions.

## Phase 4: Information Enrichment
Check domain config's enrichment_rules to determine if web searches are needed.
Only search for time-sensitive or rapidly-changing information.
Batch related searches when possible.

## Phase 5: Plan Synthesis
Use domain's plan_template to structure output.
Ensure all must_include items are present.
Run safety_checks defined in domain config.
Make plan actionable with specific tasks, timelines, and success criteria.

## Cross-Domain Principles

**Always:**
- Be specific, not vague ("Buy running shoes" not "Get equipment")
- Include realistic time estimates
- Acknowledge trade-offs and constraints
- Provide alternatives for key decisions
- Check safety and wellbeing implications

**Never:**
- Make plans that require more time/budget than user specified
- Skip safety considerations
- Create unhealthy or extreme plans
- Assume information not explicitly provided

🎯 Domain Registry Pattern
pythonclass DomainRegistry:
    def __init__(self):
        self.domains = {}
        self.load_domains()
    
    def load_domains(self):
        """Load all domain configs from /domains/*.json"""
        for config_file in Path('domains').glob('*.json'):
            domain = json.loads(config_file.read_text())
            self.domains[domain['domain']] = domain
            
            # Register aliases
            for alias in domain['aliases']:
                self.domains[alias] = domain
    
    def detect_domain(self, user_input: str) -> str:
        """Use LLM to classify input into domain"""
        prompt = f"""
        Classify this planning request into one of these domains:
        {list(self.domains.keys())}
        
        User input: {user_input}
        
        Return just the domain name.
        """
        return claude.complete(prompt).strip()
    
    def get_questions(self, domain: str, plan_type: str) -> list:
        """Get questions for domain and plan type"""
        config = self.domains[domain]
        return config['questions'][plan_type]
    
    def get_enrichment_rules(self, domain: str) -> list:
        """Get search rules for domain"""
        return self.domains[domain]['enrichment_rules']

🔧 Example: Adding "Home Renovation" Domain
json{
  "domain": "home_renovation",
  "aliases": ["remodel", "renovation", "home improvement"],
  
  "questions": {
    "quick_plan": [
      {
        "id": "project_type",
        "question": "What room or area are you renovating?",
        "why_matters": "Different spaces have different requirements and costs",
        "required": true
      },
      {
        "id": "budget",
        "question": "What's your budget range?",
        "why_matters": "Determines materials, contractor vs DIY, and scope",
        "required": true
      },
      {
        "id": "timeline",
        "question": "When do you need this completed by?",
        "why_matters": "Affects contractor availability and material ordering",
        "required": true
      },
      {
        "id": "skill_level",
        "question": "Will you DIY, hire pros, or mix of both?",
        "why_matters": "Determines feasibility and timeline accuracy",
        "required": true
      },
      {
        "id": "living_situation",
        "question": "Will you live in the home during renovation?",
        "why_matters": "Affects project sequencing and safety planning",
        "required": true
      }
    ]
  },
  
  "enrichment_rules": [
    {
      "condition": "has_location",
      "searches": [
        "building permits required {location} {project_type}",
        "average cost {project_type} renovation {location}",
        "contractor recommendations {location}"
      ]
    }
  ],
  
  "safety_checks": [
    "warn_about_permits",
    "recommend_licensed_pros_for_electrical_plumbing",
    "check_asbestos_lead_concerns_if_old_home"
  ]
}

🎨 Benefits of This Universal Approach
For Users:

Consistent experience across all planning types
Same quality regardless of domain
Easy to learn once, use everywhere

For Development:

Add new domains by just writing JSON config
No code changes needed for new categories
Test framework once, works for all domains

For Maintenance:

Update planning logic in one place
Domain experts can contribute configs without coding
Easy to version and track domain-specific improvements


🚀 Implementation Priority
Phase 1: Core domains (launch with these)
- travel
- interview_prep
- fitness_program
- meal_planning
- date_planning
Phase 2: Expand (add based on usage)
- hiking_trip
- home_renovation
- wedding_planning
- financial_planning
- learning_new_skill
Phase 3: Long tail (community contributed)
- pet_training
- garden_planning
- move_planning
- party_planning
- etc.

📝 Key Insight
The pattern works universally because all planning shares the same structure:

Understand context
Gather requirements
Get current information
Create actionable steps
Verify feasibility

Only the domain knowledge (questions, enrichment rules, safety checks) changes. The process stays identical.
This is how you scale from 5 categories to 500+ without rewriting your system.