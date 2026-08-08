import { Link } from "react-router-dom";
import { useLang } from "../../context/LangContext";
import { ReactionProvider, useReactionContext } from "../../context/ReactionContext";
import { REACTIONS } from "../../config/reactions";

function ReactionContent() {
    const { t, lang } = useLang();
    const { counts, mine, loading, toggleReaction, user } = useReactionContext();

    if (loading) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-fwm-lg border border-fwm-line bg-fwm-card px-4 py-3">
            {REACTIONS.map((reaction) => {
                const active = mine === reaction.type;
                return (
                    <button
                        type="button"
                        key={reaction.type}
                        disabled={!user}
                        onClick={() => toggleReaction(reaction.type)}
                        title={reaction.label[lang]}
                        className={`flex items-center gap-2 rounded-fwm-pill border px-3.5 py-2 text-sm font-bold transition hover:scale-105 active:scale-95 ${active
                            ? 'border-fwm-accent bg-fwm-accent/10 text-fwm-accent shadow-sm'
                            : 'border-fwm-line text-fwm-muted hover:border-fwm-accent hover:text-fwm-accent'
                            } ${!user ? 'cursor-not-allowed opacity-60 hover:scale-100' : ''}`}
                    >
                        <img src={reaction.icon} className="h-8 w-8" alt={reaction.label[lang]} />
                        <span>{reaction.label[lang]}</span>
                        <span className="opacity-70">{counts[reaction.type] ?? 0}</span>
                    </button>
                )
            })}
            {!user && (
                <Link to="/dang-nhap" className="ml-auto text-xs font-bold text-fwm-accent hover:underline">
                    {t.reaction.loginToReact}
                </Link>
            )}
        </div>
    )
}

function ReactionBar({ postId }) {
    return (
        <ReactionProvider postId={postId}>
            <ReactionContent />
        </ReactionProvider>
    )
}

export default ReactionBar;
