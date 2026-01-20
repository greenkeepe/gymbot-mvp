// GymBot Widget - Embeddable Chat Widget
(function () {
    window.GymBot = {
        init: function (config) {
            const { gymId, position = 'bottom-right', theme = 'light' } = config;

            if (!gymId) {
                console.error('GymBot: gymId is required');
                return;
            }

            // Create widget container
            const widget = document.createElement('div');
            widget.id = 'gymbot-widget';
            widget.style.cssText = `
                position: fixed;
                ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                width: 400px;
                height: 600px;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 999999;
                display: none;
                overflow: hidden;
            `;

            // Create iframe
            const iframe = document.createElement('iframe');
            iframe.src = `https://gymbot-mvp.vercel.app/widget-chat.html?gymId=${gymId}&theme=${theme}`;
            iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
            widget.appendChild(iframe);

            // Create toggle button
            const button = document.createElement('button');
            button.id = 'gymbot-toggle';
            button.innerHTML = '💬';
            button.style.cssText = `
                position: fixed;
                ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                font-size: 28px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                z-index: 999998;
                transition: transform 0.3s;
            `;

            button.addEventListener('click', () => {
                const isOpen = widget.style.display === 'block';
                widget.style.display = isOpen ? 'none' : 'block';
                button.innerHTML = isOpen ? '💬' : '✕';
                button.style.transform = isOpen ? 'scale(1)' : 'scale(1.1)';
            });

            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
            });

            button.addEventListener('mouseleave', () => {
                if (widget.style.display !== 'block') {
                    button.style.transform = 'scale(1)';
                }
            });

            document.body.appendChild(widget);
            document.body.appendChild(button);
        }
    };
})();
