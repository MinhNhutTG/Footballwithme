import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? <p className="text-fwm-muted">Có lỗi xảy ra.</p>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
