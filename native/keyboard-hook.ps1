$ErrorActionPreference = 'Stop'

$source = @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Threading;

public static class KeyboardHook
{
    private const int WH_KEYBOARD_LL = 13;
    private const int HC_ACTION = 0;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int WM_QUIT = 0x0012;
    private const int VK_ESCAPE = 0x1B;
    private const int VK_LWIN = 0x5B;
    private const int VK_RWIN = 0x5C;

    private delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);

    [StructLayout(LayoutKind.Sequential)]
    private struct KeyboardData
    {
        public uint VirtualKey;
        public uint ScanCode;
        public uint Flags;
        public uint Time;
        public UIntPtr ExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Point
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MessageData
    {
        public IntPtr Window;
        public uint Id;
        public UIntPtr WParam;
        public IntPtr LParam;
        public uint Time;
        public Point Position;
        public uint Private;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(
        int hookType,
        HookProc callback,
        IntPtr module,
        uint threadId);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hook);

    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(
        IntPtr hook,
        int code,
        IntPtr message,
        IntPtr data);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern int GetMessage(
        out MessageData message,
        IntPtr window,
        uint minimum,
        uint maximum);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool PostThreadMessage(
        uint threadId,
        uint message,
        UIntPtr wParam,
        IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int virtualKey);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr GetModuleHandle(string moduleName);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    private static readonly HookProc Callback = HandleKeyboard;
    private static IntPtr hook;
    private static uint hookThreadId;

    public static void Run()
    {
        hookThreadId = GetCurrentThreadId();
        hook = SetWindowsHookEx(
            WH_KEYBOARD_LL,
            Callback,
            GetModuleHandle(null),
            0);

        if (hook == IntPtr.Zero)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        Console.Out.WriteLine("READY");
        Console.Out.Flush();

        var inputMonitor = new Thread(() =>
        {
            Console.In.ReadLine();
            PostThreadMessage(hookThreadId, WM_QUIT, UIntPtr.Zero, IntPtr.Zero);
        });
        inputMonitor.IsBackground = true;
        inputMonitor.Start();

        MessageData message;
        while (GetMessage(out message, IntPtr.Zero, 0, 0) > 0)
        {
        }

        UnhookWindowsHookEx(hook);
        hook = IntPtr.Zero;
    }

    private static IntPtr HandleKeyboard(int code, IntPtr message, IntPtr data)
    {
        if (code >= HC_ACTION)
        {
            var messageId = message.ToInt32();
            if (messageId == WM_KEYDOWN ||
                messageId == WM_KEYUP ||
                messageId == WM_SYSKEYDOWN ||
                messageId == WM_SYSKEYUP)
            {
                var key = (KeyboardData)Marshal.PtrToStructure(
                    data,
                    typeof(KeyboardData));

                if (key.VirtualKey == VK_LWIN || key.VirtualKey == VK_RWIN)
                {
                    return new IntPtr(1);
                }

                if (key.VirtualKey == VK_ESCAPE &&
                    (GetAsyncKeyState(0x11) & 0x8000) != 0)
                {
                    return new IntPtr(1);
                }
            }
        }

        return CallNextHookEx(hook, code, message, data);
    }
}
'@

try {
    Add-Type -TypeDefinition $source -Language CSharp -ErrorAction Stop
    [KeyboardHook]::Run()
} catch {
    [Console]::Out.WriteLine('ERROR')
    [Console]::Out.Flush()
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
