export async function delayInSeconds (time: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, time))
}
