import { useAuth } from '../../context/AuthContext'
import { useRef, useEffect } from 'react'

function GoogleButton({ onSuccess, onError }) {
    const { loginWithGoogle } = useAuth();

    const buttonRef = useRef(null);

    useEffect(() => {
        if (!window.google || !buttonRef.current) return;

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: async (response) => {
                try {
                    const user = await loginWithGoogle(response.credential);
                    onSuccess?.(user);
                } catch (err) {
                    onError?.(err.message);
                }
            },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
        });
    }, [loginWithGoogle, onSuccess, onError]);
    return (
        <div ref={buttonRef} className="flex justify-center">

        </div>
    )
}


export default GoogleButton;