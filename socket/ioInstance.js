// socket/ioInstance.js
// Singleton to share the io instance across controllers without circular deps

let _io = null;

export const setIO = (io) => {
  _io = io;
};

export const getIO = () => {
  if (!_io) throw new Error("Socket.io not initialized");
  return _io;
};
