class ApplicationLifecycle {
  constructor(timeoutScheduler, webSocketGateway) {
    this.timeoutScheduler = timeoutScheduler;
    this.webSocketGateway = webSocketGateway;
    this.started = false;
  }

  async start() {
    if (this.started) {
      return;
    }
    await this.timeoutScheduler.restore();
    await this.webSocketGateway.restore();
    this.started = true;
  }

  stop() {
    this.timeoutScheduler.stop();
    this.webSocketGateway.stop();
    this.started = false;
  }
}

module.exports = ApplicationLifecycle;
