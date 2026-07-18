export class ProjectAlreadyOpenError extends Error {
  readonly projectId: string;

  constructor(projectId: string) {
    super("This project is already open for editing in another tab");
    this.name = "ProjectAlreadyOpen";
    this.projectId = projectId;
  }
}
