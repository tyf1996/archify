/* Illustrative interface fixture, not an implemented worker library. */
int worker_open(unsigned int capacity);
int worker_run(const char *job, unsigned int timeout_ms);
void worker_close(void);
