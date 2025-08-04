class Drama {
    constructor(executeFun,externalMethod,type, interval = 1000, maxDuration = null) {
        this.externalMethod = externalMethod;
        this.interval = interval;
        this.maxDuration = maxDuration;
        this.timerId = null;
        this.timeoutId = null;
        this.elapsedTime = 0; // 记录已经播放的时间
        this.startTime = null; // 记录开始播放的时间
        this.type = type;
        this.events = {};

        this.executeFun = executeFun;

        this.frameIndex = 0;
        this.frameLength = maxDuration/interval;
    }

    // 注册事件监听器
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    // 触发事件
    trigger(event,...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }

    // 开始播放
    play() {
        if (this.timerId === null) {
            if (this.startTime === null) {
                this.startTime = Date.now();
            }
            this.trigger('start');

            if(this.elapsedTime === 0){
                this.executeFun();
            }

            // 设置定时器周期性执行
            this.timerId = setInterval(() => {
                this.elapsedTime = Date.now() - this.startTime;
                if (typeof this.externalMethod === 'function') {
                    this.externalMethod();
                }
                this.frameIndex++;
                //console.log(this.frameIndex,this.frameLength,);
                this.trigger('update',(+(this.frameIndex/this.frameLength).toFixed(2)),this.frameIndex,this.frameLength);
            }, this.interval);

            // 设置最大持续时间，如果提供了该参数
            if (this.maxDuration !== null) {
                const remainingTime = this.maxDuration - this.elapsedTime;
                this.timeoutId = setTimeout(() => {
                    this.stop();
                    console.log('Drama stopped after max duration.');
                    this.trigger('end');
                }, remainingTime);
            }

            console.log('Drama started playing.');
        } else {
            console.log('Drama is already playing.');
        }
    }

    // 暂停播放
    pause() {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
            this.elapsedTime = Date.now() - this.startTime;
            this.startTime = null;
            console.log('Drama paused.');
        } else {
            console.log('Drama is already paused.');
        }

        if(this.timeoutId !== null){
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    // 停止播放
    stop() {
        this.pause();
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.startTime = null;
        this.elapsedTime = 0;
        console.log('Drama stopped.');
    }

    // 销毁对象
    destroy() {
        this.stop();
        this.events = {}; // 清空事件监听器
        this.externalMethod = null;
        this.executeFun = null;
        console.log('Drama destroyed.');

        for(let a in this){
            this[a] = null;
            delete this[a];
        }
    }

    // 获取当前播放进度（已播放的时间）
    getProgress() {
        return this.elapsedTime;
    }
}

export {
    Drama
}