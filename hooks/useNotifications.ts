import Swal from 'sweetalert2'

export function useNotifications() {
  const notify = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    text?: string
  ) => {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title,
      text,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
  }

  return { notify }
}