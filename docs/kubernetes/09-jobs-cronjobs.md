# Jobs & CronJobs

<span class="exam-tag">CKA</span>

## Job

| | |
|---|---|
| **What** | Runs one or more Pods **to completion** (not forever like a Deployment). |
| **Why** | Batch work — migrations, reports, one-off scripts — must finish reliably with retries. |
| **How** | Creates Pods until `completions` successes are reached, retrying up to `backoffLimit`; `parallelism` runs several at once. |

```yaml
apiVersion: batch/v1
kind: Job
metadata: { name: db-migration }
spec:
  completions: 1              # successful Pods needed
  parallelism: 1              # Pods running at once
  backoffLimit: 3             # retries before marking Failed
  activeDeadlineSeconds: 600  # hard time limit for the whole Job
  ttlSecondsAfterFinished: 3600   # auto-delete Job + Pods after 1h
  template:
    spec:
      restartPolicy: Never    # Never or OnFailure — never Always
      containers:
        - name: migrate
          image: myapp-migrator:1.0
          command: ["./migrate.sh"]
```

```bash
kubectl create job once --image=busybox -- echo hello
kubectl get jobs
kubectl logs job/db-migration
kubectl wait --for=condition=complete job/db-migration --timeout=120s
```

| Pattern | Settings |
|---|---|
| Single run | `completions: 1` |
| Fixed count, parallel | `completions: 10`, `parallelism: 3` |
| Work queue | `parallelism: N`, no `completions` |
| Indexed (each Pod gets `JOB_COMPLETION_INDEX`) | `completionMode: Indexed` |

Extras: `podFailurePolicy` (ignore/fail fast on specific exit codes), `backoffLimitPerIndex`, `suspend: true` (used by queueing systems like **Kueue**).

## CronJob

| | |
|---|---|
| **What** | Creates **Jobs on a schedule** (cron syntax). |
| **Why** | Nightly backups, reports, cache warm-ups without an external scheduler. |
| **How** | The CronJob controller creates a Job at each tick; `concurrencyPolicy` decides what happens if the previous run is still going. |

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: nightly-backup }
spec:
  schedule: "0 2 * * *"           # min hour day month weekday — 02:00 daily
  timeZone: "Africa/Cairo"        # optional (GA since 1.27); default = controller-manager TZ
  concurrencyPolicy: Forbid       # Allow | Forbid | Replace
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: db-backup:1.0
```

```bash
kubectl create cronjob nightly --image=busybox --schedule="*/5 * * * *" -- date
kubectl create job manual-run --from=cronjob/nightly-backup    # trigger now
kubectl get cronjobs,jobs
```

| `concurrencyPolicy` | Effect |
|---|---|
| `Allow` (default) | Runs may overlap |
| `Forbid` | Skip the new run if the previous is still running — safest for non-idempotent tasks |
| `Replace` | Cancel the running Job and start the new one |

Cron helper: <https://crontab.guru>

!!! warning "Removed: `batch/v1beta1` CronJob"
    Removed in 1.25. Use `batch/v1`.

## Quick recap

- [x] Job = run to completion; `restartPolicy` Never/OnFailure; `backoffLimit`, `completions`, `parallelism`.
- [x] `ttlSecondsAfterFinished` cleans up finished Jobs.
- [x] CronJob = Jobs on a schedule; `concurrencyPolicy: Forbid` for non-idempotent work; `timeZone` supported.
- [x] Trigger manually: `kubectl create job --from=cronjob/<name>`.
