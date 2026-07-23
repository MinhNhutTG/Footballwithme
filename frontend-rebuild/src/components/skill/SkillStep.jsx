import { useLang } from '../../context/LangContext'
import GamepadKey from './GamepadKey';
function SkillStep({ step, index }) {
    const { lang } = useLang();
    return (
        <div className="flex gap-4 rounded-fwm-lg border border-fwm-line bg-fwm-card p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fwm-accent font-head text-sm font-black text-fwm-ink">
                {index + 1}
            </span>
            <div className="min-w-0 flex-1">
                <h4 className="font-head text-sm font-bold text-fwm-text">
                    {step.title[lang]}
                </h4>
                <p className="mt-1 text-sm text-fwm-muted">{step.desc[lang]}</p>
                <div className="mt-3 flex gap-2">
                    {step.keys.map((key, i) => (
                        <GamepadKey key={i} kind={key.kind} label={key.label} />
                    ))}
                </div>
            </div>

        </div>
    )

}

export default SkillStep;