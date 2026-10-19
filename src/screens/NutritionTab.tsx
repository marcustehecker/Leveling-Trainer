import type { GameState } from '../core/types'
import { Panel, Tag } from '../ui/components'

const BASICS = [
  { title: 'Protein at each meal', text: 'Eggs, Greek yogurt, beans, lentils, tofu, chicken, fish. Helps muscles recover after training.' },
  { title: 'Carbs for energy', text: 'Oats, rice, potatoes, whole-grain bread, fruit. Eat some in the meal before training.' },
  { title: 'Healthy fats', text: 'Nuts, seeds, olive oil, avocado, fish.' },
  { title: 'Fruit and vegetables', text: 'Aim for color on most plates.' },
  { title: 'Hydration', text: 'Drink water through the day. The Hydration quest tracks it.' },
]

export function NutritionTab({ s }: { s: GameState }) {
  return (
    <div className="grid gap-7 pt-3">
      <Panel title="Provisions" right={<Tag color="#8a9bb4">Stage 4</Tag>}>
        <p className="text-sm text-mute">Meal ideas, recipes, grocery lists and weekly meal plans arrive in Stage 4. Nutrition here will never be a punishment: no calorie targets unless you ask, and no rewards for eating less.</p>
      </Panel>
      <Panel title="Fuel Basics">
        <div className="grid gap-3">
          {BASICS.map((b) => (
            <div key={b.title}>
              <div className="text-sm font-medium">{b.title}</div>
              <div className="text-xs text-mute">{b.text}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-mute">General guidance, not medical advice.</p>
      </Panel>
      <Panel title="Your Notes">
        <div className="grid gap-1 text-sm">
          <div><span className="text-mute">Preferences:</span> {s.profile.diet.preferences || 'none recorded'}</div>
          <div><span className="text-mute">Allergies / restrictions:</span> {s.profile.diet.allergies || 'none recorded'}</div>
        </div>
      </Panel>
    </div>
  )
}
